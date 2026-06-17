import { access, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ArchiveItem } from "@/api";
import { USER_AGENT } from "@/constants";

const DEFAULT_DOWNLOAD_DIRECTORY = "~/Downloads/Anna's Archive";
const FAST_DOWNLOAD_TIMEOUT_MS = 15_000;
const EPUB_DOWNLOAD_TIMEOUT_MS = 120_000;

type FastDownloadResponse = {
  download_url?: string | null;
  error?: string | null;
};

export type DownloadEpubOptions = {
  mirror: string;
  annaSecretKey: string;
  downloadDirectory?: string;
};

export const isEpub = (item: ArchiveItem) => item.ext.toLowerCase() === "epub";

export const buildResultUrl = (mirror: string, item: ArchiveItem) => `${mirror}/md5/${item.id}`;

export const buildSlowDownloadUrl = (mirror: string, item: ArchiveItem, pathIndex = 0, domainIndex = 0) =>
  `${mirror}/slow_download/${item.id}/${pathIndex}/${domainIndex}`;

export const downloadEpub = async (item: ArchiveItem, options: DownloadEpubOptions): Promise<string> => {
  const cleanKey = options.annaSecretKey.trim();
  if (!cleanKey) {
    throw new Error("Anna's Archive secret key is missing.");
  }

  const targetDirectory = expandHome(options.downloadDirectory?.trim() || DEFAULT_DOWNLOAD_DIRECTORY);
  await mkdir(targetDirectory, { recursive: true });

  const downloadUrl = await getFastDownloadUrl(options.mirror, item.id, cleanKey);
  const bytes = await downloadFileBytes(downloadUrl);
  return saveEpubBytes(item, targetDirectory, bytes);
};

export const getContainingDirectory = (filePath: string) => dirname(filePath);

export const buildCleanFileBaseName = (item: ArchiveItem): string => {
  const fallback = item.id;
  const fileNameWithoutExt = item.fileName?.replace(/\.epub$/i, "") ?? null;
  const rawName = item.title || fileNameWithoutExt || fallback;
  const withoutMetadata = rawName
    .replace(/\s+\[[^\]]+\]\s*$/g, "")
    .replace(/\s+\([^)]*(?:epub|retail|z-?lib|anna|archive|converted|calibre)[^)]*\)\s*$/gi, "")
    .replace(/\s+#?\(?v\d+(?:\.\d+)?\)?$/i, "");
  const sanitized = stripTrailingAuthor(withoutMetadata, item.author)
    .replace(/[/:*?"<>|\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return sanitized || fallback;
};

const getFastDownloadUrl = async (mirror: string, id: string, secretKey: string): Promise<string> => {
  const params = new URLSearchParams({
    md5: id,
    key: secretKey,
    path_index: "0",
    domain_index: "0",
  });

  const response = await fetchWithTimeout(
    `${mirror}/dyn/api/fast_download.json?${params.toString()}`,
    FAST_DOWNLOAD_TIMEOUT_MS,
  );
  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(extractApiError(bodyText) ?? `Fast download API returned HTTP ${response.status}.`);
  }

  const body = parseJson<FastDownloadResponse>(bodyText);
  if (body.error) {
    throw new Error(body.error);
  }

  if (!body.download_url) {
    throw new Error("Fast download API did not return a download URL.");
  }

  return body.download_url;
};

const downloadFileBytes = async (url: string): Promise<Buffer> => {
  const response = await fetchWithTimeout(url, EPUB_DOWNLOAD_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}.`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error("Downloaded file was empty.");
  }

  return bytes;
};

const saveEpubBytes = async (item: ArchiveItem, targetDirectory: string, bytes: Buffer): Promise<string> => {
  const filePath = await nextAvailablePath(join(targetDirectory, `${buildCleanFileBaseName(item)}.epub`), item.id);
  await writeFile(filePath, bytes);
  return filePath;
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};

const expandHome = (path: string): string => {
  if (path === "~") {
    return homedir();
  }

  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }

  return path;
};

const nextAvailablePath = async (initialPath: string, id: string): Promise<string> => {
  const parsed = splitExtension(initialPath);

  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? initialPath : `${parsed.base} (${index})${parsed.extension}`;

    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  return `${parsed.base}-${id}${parsed.extension}`;
};

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const splitExtension = (path: string): { base: string; extension: string } => {
  if (path.toLowerCase().endsWith(".epub")) {
    return { base: path.slice(0, -5), extension: ".epub" };
  }

  return { base: path, extension: "" };
};

const stripTrailingAuthor = (title: string, author: string | undefined): string => {
  if (!author || author === "unknown") {
    return title;
  }

  const authorPattern = escapeRegExp(author).replace(/\s+/g, "\\s+");
  return title.replace(new RegExp(`\\s+[-_]+\\s+${authorPattern}\\s*$`, "i"), "").trim();
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseJson = <T>(value: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("Anna's Archive returned invalid JSON.");
  }
};

const extractApiError = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const body = JSON.parse(value) as FastDownloadResponse;
    return body.error ?? undefined;
  } catch {
    return value.includes("no_membership") ? "No active membership for this secret key." : undefined;
  }
};
