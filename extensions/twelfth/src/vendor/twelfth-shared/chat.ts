// Twelfth's chat, asked from an extension over its OAuth connection.
//
// Core runs the same turn as the web chat (app/core/src/office-chat.ts) and
// streams it as server-sent events: a `session` frame naming the conversation,
// a `snapshot`, then `status`, `activity` and `answer` frames as the turn runs,
// and `complete` or `error` at the end. `answer` always carries the WHOLE
// answer so far, not a delta. The conversation is an ordinary chat in the
// person's Twelfth history.
import { AuthError, NotSignedInError, RateLimitedError } from "./errors";
import type { Session } from "./session";

/** The selected cells, as Core's spreadsheet attachment. */
export type SheetAttachment = {
  kind: "spreadsheet";
  filename: string;
  sheetName: string | null;
  columns: string[];
  rows: Record<string, string | number>[];
  totalRows: number;
  truncated: boolean;
};

export type ChatQuestion = { sessionId?: string; text: string; attachment?: SheetAttachment };

/** A table the answer showed (the chat's `show_table`), as rows of plain values. */
export type ChatTable = { columns: string[]; rows: Record<string, unknown>[] };

/**
 * What the saved answer holds beyond its text. Tables can be drawn anywhere;
 * the rest (charts, proposed tasks, a buy list, a settings change) only work
 * in the app, so a client names them and links there.
 */
export type ChatAnswerExtras = { tables: ChatTable[]; inApp: string[] };

export type ChatEvent =
  | {
      kind: "session";
      sessionId: string;
      /** The workspace the turn ran in: in-app links in the answer are scoped to it. */
      organizationId?: string;
      /** The conversation in the app, scoped to that workspace (`/app/o/<org>/chat/<id>`). */
      url?: string;
    }
  | { kind: "status"; message: string }
  | { kind: "activity"; id: string; label: string; status: string }
  | { kind: "answer"; text: string }
  | ({ kind: "complete"; answer?: string } & ChatAnswerExtras)
  | { kind: "title"; title: string }
  | { kind: "error"; message: string; code?: string };

/** Chat isn't offered to this connection or workspace; the browser chat still is. */
export class ChatUnavailableError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** A second question while this conversation is still answering the first. */
export class ChatBusyError extends Error {
  constructor() {
    super("Twelfth is still answering in this chat. Wait for it, or stop it first.");
  }
}

export type ChatClientOptions = {
  /** Core's origin, or a dev proxy in front of it. */
  base: string;
  session: Pick<Session, "forceRefresh" | "storedToken">;
};

export function createChatClient(options: ChatClientOptions) {
  const { session } = options;
  const askUrl = `${options.base}/api/integrations/office/chat`;

  /** One authenticated request; a refused token is refreshed once, as the MCP client does. */
  async function send(url: string, init: RequestInit): Promise<Response> {
    const token = await session.storedToken();
    if (!token) throw new NotSignedInError();
    const attempt = (bearer: string) =>
      fetch(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${bearer}` } }).catch(() => {
        if (init.signal?.aborted) throw new DOMException("Stopped", "AbortError");
        throw new Error("Couldn't reach Twelfth. Check your connection.");
      });
    let response = await attempt(token);
    if (response.status === 401) {
      const current = await session.storedToken();
      const next = current && current !== token ? current : await session.forceRefresh();
      if (next && next !== token) response = await attempt(next);
    }
    if (response.status === 401) throw new NotSignedInError("Your Twelfth connection has ended. Sign in again.");
    return response;
  }

  /**
   * Ask, and call `onEvent` for each event until the turn ends. Resolves once
   * the answer is complete (the title can still follow; the stream is read to
   * its end in the background). Rejects on a refusal before the turn starts.
   */
  async function ask(question: ChatQuestion, onEvent: (event: ChatEvent) => void, signal?: AbortSignal) {
    const response = await send(askUrl, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify(question),
    });
    if (!response.ok || !response.body) throw await refusal(response);
    let ended = false;
    const deliver = (event: ChatEvent) => {
      if (event.kind === "complete" || event.kind === "error") ended = true;
      onEvent(event);
    };
    const reader = response.body.getReader();
    const parser = sseParser((name, data) => {
      const event = chatEvent(name, data);
      if (event) deliver(event);
    });
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
    } catch {
      if (signal?.aborted) return;
      // After `complete` only the title was still to come; losing it loses nothing.
      if (!ended) throw new Error("The connection to Twelfth dropped before the answer finished.");
    }
    if (!ended && !signal?.aborted) {
      deliver({ kind: "error", message: "The answer stopped before it finished. Ask again." });
    }
  }

  /** Stop the turn running in a conversation. */
  async function stop(sessionId: string): Promise<void> {
    await send(`${askUrl}/sessions/${encodeURIComponent(sessionId)}/run`, { method: "DELETE" });
  }

  return { ask, stop };
}

async function refusal(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
  const message = body.error ?? `Twelfth returned ${response.status}`;
  if (response.status === 409) return new ChatBusyError();
  if (response.status === 429) {
    const wait = Number(response.headers.get("retry-after"));
    return new RateLimitedError(Number.isFinite(wait) && wait > 0 ? wait : undefined);
  }
  if (body.code === "access_revoked") return new AuthError(message);
  if (response.status === 403 || response.status === 404 || body.code === "ai_not_configured") {
    return new ChatUnavailableError(message, body.code);
  }
  return new Error(message);
}

/** A server event, read as the pane needs it; anything else (reasoning, heartbeats) is dropped. */
export function chatEvent(name: string, data: unknown): ChatEvent | undefined {
  const payload = (data ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof payload[key] === "string" ? (payload[key] as string) : undefined);
  switch (name) {
    case "session":
      return text("sessionId")
        ? {
            kind: "session",
            sessionId: text("sessionId")!,
            ...(text("organizationId") ? { organizationId: text("organizationId") } : {}),
            ...(text("url") ? { url: text("url") } : {}),
          }
        : undefined;
    case "snapshot": {
      // The run as it stands when we attached: replayed as the frames it implies.
      const answer = text("answer");
      if (answer) return { kind: "answer", text: answer };
      const status = text("statusMessage");
      return status ? { kind: "status", message: status } : undefined;
    }
    case "status":
      return text("message") ? { kind: "status", message: text("message")! } : undefined;
    case "activity":
      return text("id") && text("label") && text("status")
        ? { kind: "activity", id: text("id")!, label: text("label")!, status: text("status")! }
        : undefined;
    case "answer":
      return { kind: "answer", text: text("text") ?? "" };
    case "complete": {
      const saved = savedContent(payload.unit);
      const answer = saved?.answer ?? saved?.text;
      return { kind: "complete", answer: typeof answer === "string" ? answer : undefined, ...answerExtras(saved) };
    }
    case "title":
      return text("title") ? { kind: "title", title: text("title")! } : undefined;
    case "error":
      return { kind: "error", message: text("error") ?? "Twelfth couldn't answer that.", code: text("code") };
    default:
      return undefined;
  }
}

/** The answer as saved: the last assistant message in the conversation `complete` carries. */
function savedContent(unit: unknown): Record<string, unknown> | undefined {
  const messages = (unit as { messages?: Array<{ role?: string; content?: Record<string, unknown> }> } | undefined)
    ?.messages;
  return Array.isArray(messages)
    ? messages.filter((message) => message?.role === "assistant").at(-1)?.content
    : undefined;
}

const nonEmpty = (value: unknown) => Array.isArray(value) && value.length > 0;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The tables in a saved answer, and what else in it only the app can show.
 * Read defensively: a stored message is history, and history written by an
 * older Core may lack any of these fields.
 */
export function answerExtras(content: Record<string, unknown> | undefined): ChatAnswerExtras {
  const presentations = Array.isArray(content?.presentations) ? content.presentations.filter(isRecord) : [];
  const tables = presentations.flatMap((item): ChatTable[] => {
    if (item.render !== "table" || !Array.isArray(item.rows)) return [];
    const rows = item.rows.filter(isRecord);
    const named = Array.isArray(item.columns)
      ? item.columns.filter((column): column is string => typeof column === "string" && column !== "")
      : [];
    const columns = named.length ? named : Object.keys(rows[0] ?? {});
    return columns.length ? [{ columns, rows }] : [];
  });
  const charts = presentations.filter((item) => item.render === "chart").length;
  const proposal = isRecord(content?.proposal) && nonEmpty(content.proposal.items);
  const inApp = [
    charts === 1 ? "a chart" : charts > 1 ? `${charts} charts` : null,
    proposal ? "proposed tasks" : null,
    nonEmpty(content?.buyRecommendations) ? "a buy list" : null,
    nonEmpty(content?.proposedSettingChanges) ? "a settings change to confirm" : null,
    isRecord(content?.supplierRowReview) ? "a supplier sheet review" : null,
  ].filter((item): item is string => item !== null);
  return { tables, inApp };
}

/** An incremental SSE reader: named events, multi-line data, comments ignored. */
export function sseParser(onEvent: (name: string, data: unknown) => void) {
  let buffer = "";
  let name = "message";
  let data: string[] = [];
  const dispatch = () => {
    if (data.length) {
      const raw = data.join("\n");
      let parsed: unknown = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // A non-JSON payload is passed through as text.
      }
      onEvent(name, parsed);
    }
    name = "message";
    data = [];
  };
  return {
    push(chunk: string) {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line === "") dispatch();
        else if (line.startsWith("event:")) name = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(line.startsWith("data: ") ? 6 : 5));
        newline = buffer.indexOf("\n");
      }
    },
  };
}
