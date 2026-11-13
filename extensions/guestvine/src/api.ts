/**
 * Talks to GuestVine's public MCP server (https://guestvine.fm/mcp) with plain
 * JSON-RPC POSTs. The server is stateless and answers in JSON, so a single
 * `tools/call` request works without an `initialize` handshake or session.
 * No API key: the endpoint is public and read-only.
 */

export const GUESTVINE_URL = "https://guestvine.fm";
const MCP_ENDPOINT = `${GUESTVINE_URL}/mcp`;

export interface Guest {
  name: string;
  context: string | null;
  shows_guested_on: number;
  page_url: string;
}

export interface Appearance {
  episode: string;
  show: string;
  published: string | null;
  audio_url: string | null;
  description: string | null;
}

export interface AppearancesResult {
  person: { name: string; context: string | null; page_url: string };
  appearances: Appearance[];
  follow_url: string;
}

interface ToolResult {
  content?: { type: string; text?: string }[];
  isError?: boolean;
}

interface JsonRpcResponse {
  result?: ToolResult;
  error?: { code: number; message: string };
}

async function callTool<T>(name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // The Streamable HTTP transport requires both, even in JSON mode.
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    signal,
  });
  if (!res.ok && res.status !== 400) {
    throw new Error(
      res.status === 429 ? "Too many requests. Try again in a few minutes." : `GuestVine returned ${res.status}`,
    );
  }
  const body = (await res.json()) as JsonRpcResponse;
  if (body.error) throw new Error(body.error.message);
  const text = body.result?.content?.find((c) => c.type === "text")?.text ?? "";
  // Tool errors (unknown person, rate limit) come back as a plain sentence.
  if (body.result?.isError) throw new Error(text || "Something went wrong");
  return JSON.parse(text) as T;
}

export async function searchGuests(query: string, signal?: AbortSignal): Promise<Guest[]> {
  const data = await callTool<{ results: Guest[] }>("search_guests", { queries: [query] }, signal);
  return data.results ?? [];
}

export async function getAppearances(
  name: string,
  opts: { limit: number; offset: number },
  signal?: AbortSignal,
): Promise<AppearancesResult> {
  return callTool<AppearancesResult>("get_appearances", { name, limit: opts.limit, offset: opts.offset }, signal);
}

/** Tag a GuestVine link so the site can tell the visit came from Raycast. */
export function withSource(url: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "raycast");
  return u.toString();
}

/**
 * The feed setup link for a person: the same /new?people=<slug> link that
 * create_feed and get_appearances' follow_url hand out. Built from page_url
 * (".../p/<slug>") so the action needs no extra request.
 */
export function setupUrl(personPageUrl: string): string {
  const segment = new URL(personPageUrl).pathname.split("/").filter(Boolean).pop() ?? "";
  const u = new URL(`${GUESTVINE_URL}/new`);
  u.searchParams.set("people", decodeURIComponent(segment));
  return withSource(u.toString());
}
