import { contentUrl, createCatalog, encodePath, summarizeAsset, TREE_API_URL } from "./assets";
import type { Asset, AssetDetails, RepositoryEntry } from "./assets";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRepositoryPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !value.includes("\\") &&
    Array.from(value).every((char) => char.charCodeAt(0) > 31) &&
    value.split("/").every((part) => part && part !== "." && part !== "..")
  );
}

function parseEntries(value: unknown): RepositoryEntry[] {
  if (!Array.isArray(value)) throw new Error("Hugging Face returned an invalid file listing. Please try again.");
  return value.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      (entry.type !== "file" && entry.type !== "directory") ||
      !isRepositoryPath(entry.path) ||
      typeof entry.size !== "number" ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0
    ) {
      throw new Error("Hugging Face returned an invalid file entry. Please try again.");
    }
    return { type: entry.type, path: entry.path, size: entry.size };
  });
}

async function request(url: string, signal?: AbortSignal): Promise<Response> {
  const timeout = AbortSignal.timeout(20_000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { Accept: "application/json" },
  });
  if (response.status === 429)
    throw new Error("Hugging Face is receiving too many requests. Wait a moment, then refresh.");
  if (response.status === 404) throw new Error("This asset is no longer available. Refresh the asset catalog.");
  if (!response.ok)
    throw new Error(`Hugging Face could not load the assets (HTTP ${response.status}). Please try again.`);
  return response;
}

export function nextPageUrl(link: string | null): string | undefined {
  const next = link?.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1];
  if (!next) return undefined;
  const url = new URL(next, TREE_API_URL);
  if (
    url.origin !== "https://huggingface.co" ||
    !(url.pathname === new URL(TREE_API_URL).pathname || url.pathname.startsWith(`${new URL(TREE_API_URL).pathname}/`))
  ) {
    throw new Error("Hugging Face returned an invalid pagination link.");
  }
  return url.toString();
}

export async function listTree(path = "", recursive = false, signal?: AbortSignal): Promise<RepositoryEntry[]> {
  if (path && !isRepositoryPath(path)) throw new Error("Invalid asset path.");
  let url: string | undefined =
    `${TREE_API_URL}${path ? `/${encodePath(path)}` : ""}?limit=1000&recursive=${recursive}`;
  const visited = new Set<string>();
  const entries = new Map<string, RepositoryEntry>();
  while (url) {
    if (visited.has(url)) throw new Error("Hugging Face repeated a page. Please refresh and try again.");
    visited.add(url);
    const response = await request(url, signal);
    for (const entry of parseEntries(await response.json())) entries.set(entry.path, entry);
    // A page can be empty and still have a continuation link.
    url = nextPageUrl(response.headers.get("link"));
  }
  return [...entries.values()];
}

export async function getCatalog(signal?: AbortSignal): Promise<Asset[]> {
  return createCatalog(await listTree("", false, signal));
}

async function readMetadata(entries: RepositoryEntry[], path: string, signal?: AbortSignal): Promise<unknown> {
  const entry = entries.find((file) => file.type === "file" && file.path === path);
  if (!entry || entry.size > 16_384) return undefined;
  try {
    const response = await request(contentUrl(path), signal);
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    // Optional metadata must not prevent browsing the asset's files.
    return undefined;
  }
}

export async function getAssetDetails(id: string, signal?: AbortSignal): Promise<AssetDetails> {
  if (!isRepositoryPath(id) || id.includes("/")) throw new Error("Invalid asset identifier.");
  const entries = await listTree(id, true, signal);
  const [roots, packaging] = await Promise.all([
    readMetadata(entries, `${id}/.metadata/com.nvidia.simready.root_usds.json`, signal),
    readMetadata(entries, `${id}/com.nvidia.simready.packaging.json`, signal),
  ]);
  const rootPaths = isRecord(roots) && Array.isArray(roots.entries) ? roots.entries.filter(isRepositoryPath) : [];
  const license = isRecord(packaging) && typeof packaging.license === "string" ? packaging.license : undefined;
  return summarizeAsset(id, entries, rootPaths, license);
}
