import { Icon, Image, environment, getPreferenceValues } from "@raycast/api";
import { readdirSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

// Shapes returned by Hister's GET /search?format=json (see client/search_types.go
// and client/document_types.go in asciimoo/hister). Only the fields used here are typed.

export enum DocType {
  Web = 0,
  Local = 1,
  Remote = 2,
}

export interface HisterDocument {
  id?: string;
  url: string;
  domain?: string;
  title?: string;
  text?: string;
  favicon?: string;
  favicon_key?: string;
  score?: number;
  added?: number;
  updated?: number;
  type?: DocType;
  language?: string;
  label?: string;
}

export interface HisterHistoryItem {
  id?: string;
  url: string;
  title?: string;
  text?: string;
  domain?: string;
  count?: number;
  pinned?: boolean;
  added?: number;
  updated?: number;
}

export interface HisterSemanticHit {
  doc_id: string;
  similarity: number;
  matched_chunk?: string;
  document?: HisterDocument;
}

export interface HisterSearchResponse {
  error?: string;
  total: number;
  documents: HisterDocument[] | null;
  history: HisterHistoryItem[] | null;
  semantic_hits?: HisterSemanticHit[] | null;
  page_key?: string;
  query_suggestion?: string;
  search_duration?: string;
}

export type ErrorKind = "unreachable" | "auth" | "query" | "server" | "response";

export class HisterError extends Error {
  constructor(
    message: string,
    readonly kind: ErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "HisterError";
  }
}

export const PAGE_SIZE = 30;

export function serverBaseUrl(): string {
  const raw = (getPreferenceValues<Preferences>().serverUrl || "").trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  const token = getPreferenceValues<Preferences>().accessToken?.trim();
  return token ? { "X-Access-Token": token } : {};
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const base = serverBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new HisterError(`Can't reach Hister at ${base}`, "unreachable");
  }
  if (res.status === 401 || res.status === 403) {
    throw new HisterError("Hister rejected the request. Check the access token.", "auth", res.status);
  }
  if (res.status === 400) {
    throw new HisterError((await readError(res)) || "Hister couldn't parse this query", "query", 400);
  }
  if (!res.ok) {
    throw new HisterError(`Hister returned HTTP ${res.status}`, "server", res.status);
  }
  return res;
}

async function readError(res: Response): Promise<string> {
  const body = (await res.text()).trim();
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // plain-text error body
  }
  return body;
}

export async function search(
  text: string,
  options: { pageKey?: string; semantic?: boolean; signal?: AbortSignal } = {},
): Promise<HisterSearchResponse> {
  const params = new URLSearchParams({
    format: "json",
    q: text,
    // "HTML" highlighting returns a text snippet with <mark> around matched terms.
    query: JSON.stringify({ highlight: "HTML", limit: PAGE_SIZE }),
  });
  if (options.pageKey) params.set("page_key", options.pageKey);
  if (options.semantic) params.set("semantic", "1");

  const res = await request(`/search?${params.toString()}`, {
    headers: { Accept: "application/json", ...authHeaders() },
    signal: options.signal,
  });

  let data: HisterSearchResponse;
  try {
    data = (await res.json()) as HisterSearchResponse;
  } catch {
    throw new HisterError(`Unexpected response from ${serverBaseUrl()}. Is this a Hister server?`, "response");
  }
  if (data.error) throw new HisterError(data.error, "query");
  return data;
}

// POST /api/history records which result was opened for a query (the same call the
// web UI makes), so Hister can promote it next time. Origin "hister://" is the
// CSRF exemption Hister grants to non-browser clients.
export async function updateHistory(body: {
  url: string;
  title?: string;
  query: string;
  pin?: boolean;
  delete?: boolean;
}): Promise<void> {
  await request("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "hister://", ...authHeaders() },
    body: JSON.stringify(body),
  });
}

export function webUiUrl(query?: string): string {
  const base = serverBaseUrl();
  return query ? `${base}/?q=${encodeURIComponent(query)}` : `${base}/`;
}

export function fallbackSearchUrl(query: string): string {
  const template =
    (getPreferenceValues<Preferences>().fallbackSearchUrl || "").trim() || "https://duckduckgo.com/?q=%s";
  const encoded = encodeURIComponent(query);
  return template.includes("%s") ? template.split("%s").join(encoded) : `${template}${encoded}`;
}

export function docIcon(doc: Pick<HisterDocument, "type">, faviconPath?: string): Image.ImageLike {
  const fallback = doc.type === DocType.Local ? Icon.Document : Icon.Globe;
  return faviconPath ? { source: faviconPath, fallback } : fallback;
}

// Favicons are downloaded from Hister (with the access token, if any) and kept in the
// extension's support folder, keyed by Hister's content-addressed favicon_key. Raycast
// then shows them from disk, which also works for http:// and token-protected servers.
const FAVICON_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/svg+xml": "svg",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};
const FAVICON_KEY = /^[a-f0-9]{16,128}$/i;

function faviconDir(): string {
  return join(environment.supportPath, "favicons");
}

export function cachedFavicons(): Map<string, string> {
  const paths = new Map<string, string>();
  try {
    for (const file of readdirSync(faviconDir())) {
      const key = file.split(".")[0];
      if (FAVICON_KEY.test(key)) paths.set(key, join(faviconDir(), file));
    }
  } catch {
    // No favicons cached yet.
  }
  return paths;
}

export async function downloadFavicon(key: string): Promise<string | undefined> {
  if (!FAVICON_KEY.test(key)) return undefined;
  const res = await request(`/api/favicon?key=${encodeURIComponent(key)}`, { headers: authHeaders() });
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const extension = FAVICON_EXTENSIONS[type];
  if (!extension) return undefined;
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 1024 * 1024) return undefined;
  await mkdir(faviconDir(), { recursive: true });
  const path = join(faviconDir(), `${key}.${extension}`);
  await writeFile(path, bytes);
  return path;
}

export function docTypeLabel(type?: DocType): string {
  switch (type) {
    case DocType.Local:
      return "Local file";
    case DocType.Remote:
      return "Remote file";
    default:
      return "Web page";
  }
}

export function fromUnix(seconds?: number): Date | undefined {
  return seconds && seconds > 0 ? new Date(seconds * 1000) : undefined;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function escapeMarkdown(s: string): string {
  // Parentheses and brackets are left alone: Raycast renders \( \) and \[ \] as LaTeX.
  // A zero-width space after "]" stops "[text](url)" in page text from becoming a link.
  return s.replace(/[\\`*_{}#+\-.!|<>~$]/g, "\\$&").replace(/\]\(/g, "]\u200b(");
}

/** Turns a Hister snippet (plain text with <mark> highlights) into one line of Markdown. */
export function snippetToMarkdown(snippet?: string): string {
  if (!snippet) return "";
  const merged = snippet.replace(/<\/mark><mark>/g, "");
  const parts = merged.split(/(<mark>[\s\S]*?<\/mark>)/g);
  return parts
    .map((part) => {
      const marked = part.startsWith("<mark>") && part.endsWith("</mark>");
      const inner = marked ? part.slice(6, -7) : part;
      const text = escapeMarkdown(decodeEntities(inner.replace(/<[^>]+>/g, "")).replace(/\s+/g, " "));
      if (!marked || !text.trim()) return text;
      // Bold markers must touch the word, so keep surrounding spaces outside them.
      const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/) ?? ["", "", text, ""];
      return `${lead}**${core}**${trail}`;
    })
    .join("")
    .trim();
}

export function plainSnippet(snippet?: string): string {
  if (!snippet) return "";
  return decodeEntities(snippet.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}
