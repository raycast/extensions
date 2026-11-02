export type Visibility = "PRIVATE" | "PROTECTED" | "PUBLIC";
export type ApiVersion = "auto" | "v1" | "current";
type ResolvedApi = Exclude<ApiVersion, "auto">;

export interface MemosConfig {
  serverUrl: string;
  accessToken: string;
  apiVersion: ApiVersion;
}

export interface MemoInput {
  memo: string;
  tags: string;
  sourceUrl: string;
  visibility: Visibility;
}

export interface CreatedMemo {
  url: string;
  apiVersion: ResolvedApi;
}

export class MemosError extends Error {
  constructor(
    message: string,
    public readonly uncertain = false,
  ) {
    super(message);
    this.name = "MemosError";
  }
}

export function normalizeServerUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new MemosError("Enter a complete Memos URL in extension preferences, such as https://memos.example.com.");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new MemosError("Use an HTTP or HTTPS Memos URL without credentials, query parameters, or fragments.");
  }
  url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/api(?:\/v1)?(?:\/memos)?$/, "");
  return url.toString().replace(/\/+$/, "");
}

function normalizeToken(input: string): string {
  const token = input
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (
    !token ||
    /\s/.test(token) ||
    Array.from(token).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  ) {
    throw new MemosError("Enter a valid access token in extension preferences.");
  }
  return token;
}

export function normalizeSourceUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || /[\r\n]/.test(value)) {
      throw new Error();
    }
    return value;
  } catch {
    throw new MemosError("Enter a complete HTTP or HTTPS link without embedded credentials.");
  }
}

export function composeContent(input: Pick<MemoInput, "memo" | "tags" | "sourceUrl">): string {
  // Markdown indentation and trailing spaces can carry meaning.
  const memo = input.memo.trim() ? input.memo : "";
  const sourceUrl = normalizeSourceUrl(input.sourceUrl);
  if (!memo && !sourceUrl) throw new MemosError("Write a memo or add a link.");
  const existingTags = new Set(Array.from(memo.matchAll(/(?:^|\s)#([^\s#,，]+)/g), (match) => match[1]));
  const tags = Array.from(
    new Set(
      input.tags
        .split(/[\s,，]+/)
        .map((tag) => tag.replace(/^#+/, ""))
        .filter((tag) => tag && !existingTags.has(tag)),
    ),
    (tag) => `#${tag}`,
  ).join(" ");
  return [memo, sourceUrl, tags].filter(Boolean).join("\n\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function endpoint(base: string, api: ResolvedApi): string {
  return `${base}/api${api === "v1" ? "/v1" : ""}/memos`;
}

function statusError(status: number, sending: boolean): MemosError {
  if (status === 401)
    return new MemosError("The access token is invalid or expired. Update it in extension preferences.");
  if (status === 403)
    return new MemosError("Access was denied. Check the token permissions and your instance access restrictions.");
  if (status === 404 || status === 405) {
    return new MemosError("Memos API not found. Check the Memos URL and API Version preferences.");
  }
  if (status === 400)
    return new MemosError(
      "The server rejected the memo. Check its length and visibility against your instance settings.",
    );
  if (status === 413) return new MemosError("The memo exceeds the server size limit. Shorten it and try again.");
  if (status === 429) return new MemosError("Too many requests. Try again later.");
  return new MemosError(
    `Server returned HTTP ${status}. ${sending ? "Check Memos to see whether the memo was saved before retrying." : "Check the connection again later."}`,
    sending && status >= 500,
  );
}

async function request(
  url: string,
  token: string,
  fetcher: typeof fetch,
  content?: { content: string; visibility: Visibility },
): Promise<Response> {
  const sending = content !== undefined;
  try {
    const response = await fetcher(url, {
      method: sending ? "POST" : "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(sending ? { "Content-Type": "application/json" } : {}),
      },
      ...(sending ? { body: JSON.stringify(content) } : {}),
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status >= 300 && response.status < 400) {
      throw new MemosError("The URL redirects. Set Memos URL to the final website address shown in your browser.");
    }
    return response;
  } catch (error) {
    if (error instanceof MemosError) throw error;
    // Never show raw network/server errors: they may contain URLs or credentials.
    throw new MemosError(
      sending
        ? "The connection was interrupted or timed out. Check Memos before retrying; your input has been kept."
        : "Cannot connect to Memos. Check the URL, network, and HTTPS certificate.",
      sending,
    );
  }
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.toLowerCase().includes("json")) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function resolveApi(config: MemosConfig, fetcher: typeof fetch, verify = false): Promise<ResolvedApi> {
  const base = normalizeServerUrl(config.serverUrl);
  const token = normalizeToken(config.accessToken);
  if (!["auto", "v1", "current"].includes(config.apiVersion)) throw new MemosError("Check the API Version preference.");
  if (config.apiVersion !== "auto" && !verify) return config.apiVersion;
  const candidates: ResolvedApi[] = config.apiVersion === "auto" ? ["current", "v1"] : [config.apiVersion];
  for (const api of candidates) {
    const response = await request(`${endpoint(base, api)}?pageSize=1`, token, fetcher);
    if (response.status === 404 || response.status === 405) continue;
    if (!response.ok) throw statusError(response.status, false);
    const body = await readJson(response);
    if (
      isRecord(body) &&
      (Array.isArray(body.memos) || Object.keys(body).length === 0 || typeof body.nextPageToken === "string")
    ) {
      return api;
    }
    // Old servers sometimes serve the website's HTML for an unknown API path.
  }
  throw new MemosError("Could not detect the Memos API. Check the URL or choose an endpoint in API Version.");
}

export async function testConnection(config: MemosConfig, fetcher: typeof fetch = fetch): Promise<ResolvedApi> {
  return resolveApi(config, fetcher, true);
}

export async function createMemo(
  config: MemosConfig,
  input: MemoInput,
  fetcher: typeof fetch = fetch,
): Promise<CreatedMemo> {
  const content = composeContent(input);
  if (!["PRIVATE", "PROTECTED", "PUBLIC"].includes(input.visibility))
    throw new MemosError("Choose a valid visibility.");
  const base = normalizeServerUrl(config.serverUrl);
  const token = normalizeToken(config.accessToken);
  const api = await resolveApi(config, fetcher);
  // A POST is never retried against another endpoint: the memo may already exist.
  const response = await request(endpoint(base, api), token, fetcher, { content, visibility: input.visibility });
  if (!response.ok) throw statusError(response.status, true);
  const body = await readJson(response);
  const name = isRecord(body) && typeof body.name === "string" ? body.name.match(/^memos\/([\w-]+)$/)?.[1] : undefined;
  const uid = isRecord(body) && typeof body.uid === "string" && /^[\w-]+$/.test(body.uid) ? body.uid : undefined;
  const id = uid || name;
  if (!id) {
    throw new MemosError(
      "The server response could not be confirmed. Check Memos before retrying; your input has been kept.",
      true,
    );
  }
  return { url: `${base}/${api === "current" ? "memos" : "m"}/${encodeURIComponent(id)}`, apiVersion: api };
}
