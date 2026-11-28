// The Texthyper JSON API (docs/api.md) with the token this Raycast keeps.

import { Cache, getPreferenceValues, LocalStorage } from "@raycast/api";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir, hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import type { Article, ArticlePage, Folder, Highlight, HighlightColor, Me, SyncPage, Tag } from "./types";

const DEFAULT_SERVER = "https://app.texthyper.com";
const SESSION_KEY = "session";

export type Session = { token: string; email: string; server: string };

export class SignedOutError extends Error {
  constructor(message = "Sign in to Texthyper first") {
    super(message);
    this.name = "SignedOutError";
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function server(): string {
  const configured = getPreferenceValues<Preferences>().server?.trim();
  if (!configured) return DEFAULT_SERVER;
  const address = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  return address.replace(/\/+$/, "");
}

export function articleUrl(article: Pick<Article, "id">): string {
  return `${server()}/articles/${article.id}`;
}

// A token belongs to the server it was issued by: pointing the extension
// at another server signs it out rather than sending the token there.
export async function getSession(): Promise<Session | undefined> {
  const stored = await LocalStorage.getItem<string>(SESSION_KEY);
  if (!stored) return undefined;
  const session = JSON.parse(stored) as Session;
  return session.server === server() ? session : undefined;
}

// What the lists cached belongs to the account that loaded it, so it goes
// whenever the account does: on sign-out, a revoked token, a new sign-in.
function forgetCachedLists() {
  new Cache().clear();
}

async function forgetSession() {
  await LocalStorage.removeItem(SESSION_KEY);
  forgetCachedLists();
}

type RequestOptions = {
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  authenticated?: boolean;
};

async function send(method: string, path: string, { query, body, authenticated = true }: RequestOptions = {}) {
  const url = new URL(`${server()}/api/v1${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authenticated) {
    const session = await getSession();
    if (!session) throw new SignedOutError();
    headers.Authorization = `Bearer ${session.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error("Could not reach Texthyper. Check your connection.");
  }

  if (response.status === 401 && authenticated) {
    await forgetSession();
    throw new SignedOutError("Your Texthyper sign-in was revoked. Sign in again.");
  }
  if (!response.ok) {
    const failure = (await response.json().catch(() => ({}))) as { error?: string; errors?: string[] };
    const message = failure.error || failure.errors?.join(", ") || `Texthyper answered ${response.status}`;
    throw new ApiError(
      response.status === 429 ? "Too many requests. Try again in a minute." : message,
      response.status,
    );
  }
  return response;
}

async function request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
  const response = await send(method, path, options);
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

// Signing in: the address gets a six-digit code by email, and the code buys
// the token (docs/api.md, Authentication).

export async function requestCode(email: string) {
  await request("POST", "/login_codes", { body: { email }, authenticated: false });
}

export async function signIn(email: string, code: string): Promise<Session> {
  const device = hostname().replace(/\.local$/, "");
  const { token, user } = await request<{ token: string; user: { email_address: string } }>("POST", "/tokens", {
    body: { email, code, device_name: device ? `Raycast on ${device}` : "Raycast", platform: "api" },
    authenticated: false,
  });
  const session = { token, email: user.email_address, server: server() };
  forgetCachedLists();
  await LocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function signOut() {
  try {
    await request("DELETE", "/tokens/current");
  } catch {
    // Offline or already revoked: forgetting the token is what is left to do.
  }
  await forgetSession();
}

export function getMe() {
  return request<Me>("GET", "/me");
}

export function listArticles(options: {
  state?: string;
  folderId?: string;
  tag?: string;
  cursor?: string;
  limit?: number;
}) {
  return request<ArticlePage>("GET", "/articles", {
    query: {
      state: options.state,
      folder_id: options.folderId,
      tag: options.tag,
      cursor: options.cursor,
      limit: options.limit ?? 50,
    },
  });
}

export function searchArticles(query: string, options: { cursor?: string; limit?: number } = {}) {
  return request<ArticlePage>("GET", "/search", {
    query: { q: query, cursor: options.cursor, limit: options.limit ?? 30 },
  });
}

export function getArticle(id: number) {
  return request<Article>("GET", `/articles/${id}`);
}

export type NewArticle = { url: string; html?: string; title?: string; tags?: string[]; archived?: boolean };

// `created` is false when the URL was in the library already.
export async function saveArticle(article: NewArticle): Promise<{ article: Article; created: boolean }> {
  const response = await send("POST", "/articles", { body: article });
  return { article: (await response.json()) as Article, created: response.status === 201 };
}

export type ArticleChanges = { liked?: boolean; archived?: boolean; folder_id?: number | null; tags?: string[] };

export function updateArticle(id: number, changes: ArticleChanges) {
  return request<Article>("PATCH", `/articles/${id}`, { body: changes });
}

export function deleteArticle(id: number) {
  return request<void>("DELETE", `/articles/${id}`);
}

export function listFolders() {
  return request<Folder[]>("GET", "/folders");
}

export function listTags() {
  return request<Tag[]>("GET", "/tags");
}

export function listHighlights(articleId: number) {
  return request<Highlight[]>("GET", `/articles/${articleId}/highlights`);
}

export function updateHighlight(id: number, changes: { color?: HighlightColor; comment?: string | null }) {
  return request<Highlight>("PATCH", `/highlights/${id}`, { body: changes });
}

export function deleteHighlight(id: number) {
  return request<void>("DELETE", `/highlights/${id}`);
}

export function sync(since: number) {
  return request<SyncPage>("GET", "/sync", { query: { since, limit: 500 } });
}

async function download(response: Response, path: string) {
  if (!response.body) throw new Error("Texthyper sent an empty file");
  await pipeline(Readable.fromWeb(response.body as ReadableStream), createWriteStream(path));
  return path;
}

// The article as an EPUB in ~/Downloads, next to any file that already has
// its name; the path of the file.
export async function downloadEpub(article: Pick<Article, "id" | "title">) {
  const response = await send("GET", `/articles/${article.id}.epub`);
  const named = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1];
  const title = (named || article.title || `article-${article.id}`).replace(/\.epub$/i, "");
  const name = title.replace(/[/\\:*?"<>|]+/g, " ").trim();
  const folder = join(homedir(), "Downloads");
  await mkdir(folder, { recursive: true });

  let path = join(folder, `${name}.epub`);
  for (let copy = 2; existsSync(path); copy++) path = join(folder, `${name} ${copy}.epub`);
  return download(response, path);
}

export type CardSize = "square" | "story" | "wide";

// The highlight as a PNG quote card in the temp folder; the path of the file.
export async function downloadCard(highlightId: number, size: CardSize) {
  const response = await send("GET", `/highlights/${highlightId}/card.png`, { query: { size } });
  return download(response, join(tmpdir(), `texthyper-highlight-${highlightId}-${size}.png`));
}
