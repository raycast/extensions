import { getAccessToken } from "@raycast/utils";

// Tiro's MCP server. It accepts both the Raycast sign-in token and account API keys, while the
// REST API (/v1/external) only takes API keys from publicly registered clients.
const MCP_URL = "https://mcp.tiro.ooo/mcp";
const PROTOCOL_VERSION = "2025-06-18";

export type Person = { name?: string | null; email?: string | null };

export type Note = {
  guid: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceType: string;
  recordingDurationSeconds: number;
  webUrl: string;
  participants: Person[];
  matchedSnippets?: string[] | null;
};

type RawNote = Omit<Note, "guid"> & { guid?: string; noteGuid?: string };

type TranscriptSegment = { content: string; speaker?: { label?: string; name?: string | null } | null };
type TranscriptParagraph = { segments?: TranscriptSegment[] | null };

type ToolResult = {
  content?: { type: string; text?: string }[];
  structuredContent?: unknown;
  isError?: boolean;
};

type RpcMessage = { id?: number; result?: ToolResult; error?: { code: number; message: string } };

export class TiroApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let sessionId: string | undefined;
let initialized: Promise<void> | undefined;
let nextId = 1;

async function post(body: object): Promise<Response> {
  const { token } = getAccessToken();
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": PROTOCOL_VERSION,
      ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new TiroApiError(httpErrorMessage(response.status), response.status);
  sessionId = response.headers.get("mcp-session-id") ?? sessionId;
  return response;
}

function httpErrorMessage(status: number): string {
  if (status === 401)
    return "Tiro rejected your sign-in. Sign in again, or check the API key in the extension preferences.";
  if (status === 403) return "Your Tiro account can't read these notes.";
  if (status === 429) return "Too many requests. Try again in a minute.";
  return `Tiro returned an error (${status}).`;
}

/** Reads a JSON-RPC reply that arrives either as plain JSON or as a server-sent event stream. */
async function readMessage(response: Response, id: number): Promise<RpcMessage> {
  const text = await response.text();
  if (!(response.headers.get("content-type") ?? "").includes("text/event-stream"))
    return JSON.parse(text) as RpcMessage;

  for (const event of text.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!data) continue;
    const message = JSON.parse(data) as RpcMessage;
    if (message.id === id) return message;
  }
  throw new TiroApiError("Tiro sent an unexpected response.", 502);
}

async function rpc(method: string, params: object): Promise<RpcMessage> {
  const id = nextId++;
  const message = await readMessage(await post({ jsonrpc: "2.0", id, method, params }), id);
  if (message.error) throw new TiroApiError("Tiro couldn't complete the request.", 500);
  return message;
}

function initialize(): Promise<void> {
  initialized ??= (async () => {
    await rpc("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "tiro-raycast", version: "1.0.0" },
    });
    await post({ jsonrpc: "2.0", method: "notifications/initialized" });
  })().catch((error) => {
    initialized = undefined;
    throw error;
  });
  return initialized;
}

async function callTool<T>(name: string, args: object): Promise<T> {
  await initialize();
  const { result } = await rpc("tools/call", { name, arguments: args });
  const text = result?.content?.find((item) => item.type === "text")?.text ?? "";

  if (result?.isError) {
    const notFound = /not found/i.test(text);
    throw new TiroApiError("Tiro couldn't complete the request.", notFound ? 404 : 500);
  }
  return (result?.structuredContent ?? JSON.parse(text)) as T;
}

function toNote(raw: RawNote): Note {
  const guid = raw.guid ?? raw.noteGuid ?? "";
  return {
    ...raw,
    guid,
    webUrl: `https://tiro.ooo/n/${encodeURIComponent(guid)}`,
    participants: raw.participants ?? [],
  };
}

export async function listRecentNotes(size = 30): Promise<Note[]> {
  const result = await callTool<{ notes: RawNote[] }>("list_notes", { pagination: { size } });
  return result.notes.map(toNote);
}

export async function searchNotes(keyword: string, size = 30): Promise<Note[]> {
  const result = await callTool<{ notes: RawNote[] }>("list_notes", {
    query: { keyword },
    pagination: { size: Math.min(size, 100) },
  });
  return result.notes.map(toNote);
}

export async function getNote(guid: string): Promise<Note> {
  return toNote(await callTool<RawNote>("get_note", { note: guid }));
}

/** Returns the note's latest summary as markdown, or null when none has been generated yet. */
export async function getSummaryMarkdown(guid: string): Promise<string | null> {
  const note = await callTool<{ summary?: { content?: string } | null }>("get_note", {
    note: guid,
    include: ["summary"],
  });
  return note.summary?.content?.trim() || null;
}

/** Returns the transcript as "Speaker: text" lines. */
export async function getTranscript(guid: string): Promise<string> {
  const result = await callTool<{ paragraphs?: TranscriptParagraph[] }>("get_note_transcript", { note: guid });
  const lines: string[] = [];

  for (const paragraph of result.paragraphs ?? []) {
    for (const segment of paragraph.segments ?? []) {
      const speaker = segment.speaker?.name || segment.speaker?.label;
      lines.push(speaker ? `${speaker}: ${segment.content}` : segment.content);
    }
  }
  return lines.join("\n\n");
}

/** Returns the note's existing share link, or null when the note hasn't been shared. */
export async function getShareUrl(guid: string): Promise<string | null> {
  try {
    const result = await callTool<{ shareUrl?: string | null; url?: string | null }>("get_share_link", { note: guid });
    const value = result.shareUrl ?? result.url;
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "tiro.ooo" && !url.port && !url.username && !url.password
        ? url.href
        : null;
    } catch {
      return null;
    }
  } catch (error) {
    if (error instanceof TiroApiError && error.status === 404) return null;
    throw error;
  }
}
