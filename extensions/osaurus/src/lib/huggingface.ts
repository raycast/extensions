// Hugging Face model search. No token needed: the public API allows 500 requests per 5 minutes.

export interface HfModel {
  id: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string;
  lastModified?: string;
  tags?: string[];
}

const REPO = /^[A-Za-z0-9][\w.-]*\/[\w.-]+$/;
const NOT_MODEL_PAGES = new Set(["datasets", "spaces", "docs", "blog", "models", "collections", "papers"]);

// Turns whatever the user pasted into an "owner/name" repo id, or undefined for a plain search.
// Accepts: owner/name, huggingface.co and hf.co URLs (any sub-path, query or fragment),
// huggingface://?model=… and osaurus://open_from_hf?model=… links, and a trailing ":tag".
export function parseRepo(input: string): string | undefined {
  let text = input.trim();
  if (!text || /\s/.test(text)) return undefined;
  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    const model = url.searchParams.get("model");
    if (model) {
      text = model;
    } else if (/^(www\.)?(huggingface\.co|hf\.co)$/i.test(url.hostname)) {
      const [owner, name] = url.pathname.split("/").filter(Boolean);
      if (!owner || !name || NOT_MODEL_PAGES.has(owner)) return undefined;
      text = `${owner}/${name}`;
    }
  } catch {
    // not URL-shaped; test it as a bare repo id below
  }
  text = text.replace(/:[^/]*$/, "").replace(/\/$/, ""); // hf.co/owner/name:Q4_K_M, owner/name/
  return REPO.test(text) ? text : undefined;
}

export const huggingFaceUrl = (repo: string) => `https://huggingface.co/${repo}`;

// MLX models only: those are the ones Osaurus runs. An empty query lists the most downloaded.
export async function searchModels(query: string): Promise<HfModel[]> {
  const params = new URLSearchParams({ filter: "mlx", sort: "downloads", direction: "-1", limit: "50" });
  if (query.trim()) params.set("search", query.trim());
  const res = await fetch(`https://huggingface.co/api/models?${params}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Hugging Face returned HTTP ${res.status}`);
  return (await res.json()) as HfModel[];
}

// One repo by id. Hugging Face answers 401 rather than 404 for a repo that doesn't exist.
export async function getModel(repo: string): Promise<HfModel | undefined> {
  const res = await fetch(`https://huggingface.co/api/models/${repo}`, { signal: AbortSignal.timeout(15_000) });
  if (res.status === 401 || res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Hugging Face returned HTTP ${res.status}`);
  return (await res.json()) as HfModel;
}

// The Hugging Face search page for a query, filtered to MLX like our own search.
export const huggingFaceSearchUrl = (query: string) =>
  `https://huggingface.co/models?${new URLSearchParams({ library: "mlx", search: query.trim() })}`;

// The repo's README (its model card), YAML front matter included, with repo-relative paths made
// absolute so its images and links work wherever the Markdown ends up.
export async function getModelCard(repo: string): Promise<string | undefined> {
  const res = await fetch(`https://huggingface.co/${repo}/raw/main/README.md`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401 || res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Hugging Face returned HTTP ${res.status}`);
  return absolutizeLinks(await res.text(), repo);
}

// For display: the front matter is metadata Hugging Face reads its tags from, not prose.
export const withoutFrontMatter = (card: string) => card.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();

// For display: Raycast draws images at full size, so a README banner overflows the pane. Raycast's
// raycast-height sets a fixed height (width follows), so badges and SVGs, already small, are left alone.
// ponytail: fixed height, not a true max; a small raster image gets scaled up to it.
export function capImageHeights(card: string): string {
  const sized = (url: string) => {
    // The query goes before any #fragment; data: URIs and SVGs/badges (already small) are left alone.
    const [path, fragment] = url.split(/(?=#)/);
    if (!/^https?:/i.test(url) || /\.svg$|shields\.io|\/badge/i.test(path.split("?")[0])) return url;
    return `${path}${path.includes("?") ? "&" : "?"}raycast-height=200${fragment ?? ""}`;
  };
  return card
    .replace(/(!\[[^\]]*\]\()([^)\s]+)/g, (_, pre, url) => pre + sized(url))
    .replace(/(<img\b[^>]*?\ssrc=)(["'])(.*?)\2/gi, (_, pre, q, url) => pre + q + sized(url) + q);
}

// README paths are relative to the repo, so they break anywhere but huggingface.co. Rewrites
// images to the raw file (resolve/) and links to the file page (blob/), in Markdown and HTML.
export function absolutizeLinks(card: string, repo: string): string {
  const absolute = (path: string, kind: "resolve" | "blob") => {
    if (/^([a-z][a-z\d+.-]*:|\/\/|#)/i.test(path)) return path; // already absolute, or an anchor
    if (path.startsWith("/")) return `https://huggingface.co${path}`;
    return `https://huggingface.co/${repo}/${kind}/main/${path.replace(/^\.\//, "")}`;
  };
  return card
    .replace(/(!\[[^\]]*\]\()([^)\s]+)/g, (_, pre, path) => pre + absolute(path, "resolve"))
    .replace(/((?<!!)\[[^\]]*\]\()([^)\s]+)/g, (_, pre, path) => pre + absolute(path, "blob"))
    .replace(/(<img\b[^>]*?\ssrc=)(["'])(.*?)\2/gi, (_, pre, q, path) => pre + q + absolute(path, "resolve") + q)
    .replace(/(<a\b[^>]*?\shref=)(["'])(.*?)\2/gi, (_, pre, q, path) => pre + q + absolute(path, "blob") + q)
    .replace(/^( {0,3}\[[^\]]+\]:\s*)(\S+)/gm, (_, pre, path) => pre + absolute(path, "blob")); // [ref]: path
}
