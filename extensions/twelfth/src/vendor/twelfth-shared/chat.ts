// Twelfth's chat, asked from an extension over its OAuth connection.
//
// Core runs the same turn as the web chat (app/core/src/office-chat.ts) and
// streams it as server-sent events: a `session` frame naming the conversation,
// a `snapshot`, then `status`, `activity` and `answer` frames as the turn runs,
// and `complete` or `error` at the end. `answer` always carries the WHOLE
// answer so far, not a delta. The conversation is an ordinary chat in the
// person's Twelfth history.
//
// One chat, many surfaces. The browser and the pane look at the same
// conversation, so the client can also read it (`history`), ask what its
// latest turn is doing (`run`) and attach to a turn somebody started elsewhere
// (`attach`): a question typed in the browser streams in the pane, and a
// question typed in the pane streams in the browser, through the same run.
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

export type ChartType = "bar" | "line" | "scatter";

/**
 * A chart as structured data: what to plot and the rows behind it. The chat's
 * own show_chart produces this shape, and a chart made in Excel is saved in
 * it, so every surface draws either with one component.
 */
export type ChartSpec = {
  title?: string;
  type: ChartType;
  x: string;
  y: string;
  series?: string;
  columns: string[];
  rows: Record<string, string | number>[];
  /** Where it was made: the sheet and the cells the chart plots. */
  source?: { app: "excel"; sheet: string | null; address: string | null };
};

/**
 * A chart made in Excel, going into the conversation: the structured chart,
 * and the id of its picture once uploaded (`uploadFile`), when Excel drew one.
 */
export type ChartAttachment = { kind: "chart"; fileId?: string; chart: ChartSpec };

/** A picture alone (a chart whose figures the host could not read out), uploaded first. */
export type ImageAttachment = { kind: "image"; fileId: string };

export type ChatQuestion = {
  sessionId?: string;
  text: string;
  attachment?: SheetAttachment | ChartAttachment | ImageAttachment;
};

/** A table the answer showed (the chat's `show_table`), as rows of plain values. */
export type ChatTable = { columns: string[]; rows: Record<string, unknown>[] };

/** A chart the answer showed (the chat's `show_chart`). */
export type ChatChart = {
  type: ChartType;
  x: string;
  y: string;
  series?: string;
  columns?: string[];
  rows: Record<string, unknown>[];
};

/**
 * What the saved answer holds beyond its text. Tables and charts can be drawn
 * anywhere; the rest (proposed tasks, a buy list, a settings change) only work
 * in the app, so a client names them and links there.
 */
export type ChatAnswerExtras = { tables: ChatTable[]; charts: ChatChart[]; inApp: string[] };

export type ChatRunStatus = "running" | "complete" | "failed" | "cancelled" | "interrupted";

/** Where a turn was asked from, as Core records it. */
export type ChatTurnSource = "web" | "mcp" | "api" | "slack" | "google_chat" | "teams" | "excel" | (string & {});

/**
 * A chart or sheet a person's turn carried, as a saved message or a run
 * describes it. A chart's picture is a chat file (`fileId`), when there is one.
 */
export type ChatTurnAttachment =
  | { kind: "spreadsheet"; filename: string; totalRows: number }
  | { kind: "image"; fileId: string; filename: string }
  | { kind: "chart"; fileId: string | null; filename: string; chart: ChartSpec };

/** The latest turn of a conversation, as Core's run row has it. */
export type ChatRun = {
  id: string;
  sessionId: string;
  status: ChatRunStatus;
  prompt: string;
  source: ChatTurnSource | null;
  attachment: ChatTurnAttachment | null;
  startedAt: string;
  finishedAt: string | null;
};

export type ChatEvent =
  | {
      kind: "session";
      sessionId: string;
      /** The workspace the turn ran in: in-app links in the answer are scoped to it. */
      organizationId?: string;
      /** The conversation in the app, scoped to that workspace (`/app/o/<org>/chat/<id>`). */
      url?: string;
    }
  /** The run as it stood when this reader joined it. First on an attach; also sent to the asker. */
  | { kind: "snapshot"; runId?: string; status?: ChatRunStatus; prompt?: string; answer?: string; message?: string }
  | { kind: "status"; message: string }
  | { kind: "activity"; id: string; label: string; status: string }
  | { kind: "answer"; text: string }
  | ({ kind: "complete"; answer?: string } & ChatAnswerExtras)
  | { kind: "title"; title: string }
  | { kind: "error"; message: string; code?: string };

/** A saved message, as Core's history has it. */
export type ChatHistoryMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  turn: number;
  content: Record<string, unknown>;
  createdAt: string;
  source: ChatTurnSource | null;
  authorName: string | null;
};

/** One question and its answer, read out of a conversation's history. */
export type ChatHistoryTurn = {
  /** The user message's id. */
  id: string;
  turn: number;
  question: string;
  source: ChatTurnSource | null;
  attachment: ChatTurnAttachment | null;
  askedAt: string;
  /** Absent while the answer has not been saved yet. */
  answer?: string;
  extras: ChatAnswerExtras;
};

/** A file in the workspace store, as the upload route returns it. */
export type ChatStoredFile = {
  id: string;
  filename: string;
  contentType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
};

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
  const sessionUrl = (sessionId: string) => `${askUrl}/sessions/${encodeURIComponent(sessionId)}`;

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
   * Read a turn's events to the end of the stream. Resolves once the answer
   * is complete (the title can still follow). A stream that drops before the
   * turn ends is an error the caller sees; one that ends without saying how
   * is reported as an error event.
   */
  async function readTurn(response: Response, onEvent: (event: ChatEvent) => void, signal?: AbortSignal) {
    if (!response.body) throw new Error("Twelfth sent an empty reply.");
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
    if (!response.ok) throw await refusal(response);
    await readTurn(response, onEvent, signal);
  }

  /**
   * Attach to the turn a conversation is answering now, wherever it was asked
   * from, and read it as `ask` does. The first event is a `snapshot` of the
   * turn so far. Resolves false, with no events, when there is nothing to
   * attach to (204).
   */
  async function attach(
    sessionId: string,
    onEvent: (event: ChatEvent) => void,
    signal?: AbortSignal,
  ): Promise<boolean> {
    const response = await send(`${sessionUrl(sessionId)}/run/stream`, {
      method: "GET",
      signal,
      headers: { accept: "text/event-stream" },
    });
    if (response.status === 204) return false;
    if (!response.ok) throw await refusal(response);
    await readTurn(response, onEvent, signal);
    return true;
  }

  /** The conversation's latest turn, or null when it has never had one. */
  async function run(sessionId: string, signal?: AbortSignal): Promise<ChatRun | null> {
    const response = await send(`${sessionUrl(sessionId)}/run`, { method: "GET", signal });
    if (!response.ok) throw await refusal(response);
    const body = (await response.json().catch(() => ({}))) as { run?: unknown };
    return chatRun(body.run);
  }

  /** The conversation's saved messages, oldest first. */
  async function history(sessionId: string, signal?: AbortSignal): Promise<ChatHistoryMessage[]> {
    const response = await send(sessionUrl(sessionId), { method: "GET", signal });
    if (!response.ok) throw await refusal(response);
    const body = (await response.json().catch(() => ({}))) as { messages?: unknown };
    return Array.isArray(body.messages) ? body.messages.filter(isRecord).map(historyMessage) : [];
  }

  /** Stop the turn running in a conversation. */
  async function stop(sessionId: string): Promise<void> {
    await send(`${sessionUrl(sessionId)}/run`, { method: "DELETE" });
  }

  /** Put a picture in the workspace store for a turn: a chart's rendering, as the app uploads a screenshot. */
  async function uploadFile(file: Blob, filename: string): Promise<ChatStoredFile> {
    const form = new FormData();
    form.set("purpose", "chat");
    form.set("file", file, filename);
    const response = await send(`${askUrl}/files`, { method: "POST", body: form });
    if (!response.ok) throw await refusal(response);
    const body = (await response.json().catch(() => ({}))) as { file?: ChatStoredFile };
    if (!body.file?.id) throw new Error("Twelfth didn't keep the picture.");
    return body.file;
  }

  return { ask, attach, run, history, stop, uploadFile };
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

const RUN_STATUSES: ReadonlySet<string> = new Set(["running", "complete", "failed", "cancelled", "interrupted"]);
const CHART_TYPES: ReadonlySet<string> = new Set(["bar", "line", "scatter"]);

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
      // The run as it stands when we attached: what it was asked, how far the
      // answer is, and what it is doing. A reader that asked the question
      // already knows the first; one that joined needs all three.
      const status = text("status");
      return {
        kind: "snapshot",
        ...(text("id") ? { runId: text("id") } : {}),
        ...(status && RUN_STATUSES.has(status) ? { status: status as ChatRunStatus } : {}),
        ...(text("prompt") ? { prompt: text("prompt") } : {}),
        ...(text("answer") ? { answer: text("answer") } : {}),
        ...(text("statusMessage") ? { message: text("statusMessage") } : {}),
      };
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
const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item !== "") : [];

/**
 * The tables and charts in a saved answer, and what else in it only the app
 * can show. Read defensively: a stored message is history, and history
 * written by an older Core may lack any of these fields.
 */
export function answerExtras(content: Record<string, unknown> | undefined): ChatAnswerExtras {
  const presentations = Array.isArray(content?.presentations) ? content.presentations.filter(isRecord) : [];
  const tables = presentations.flatMap((item): ChatTable[] => {
    if (item.render !== "table" || !Array.isArray(item.rows)) return [];
    const rows = item.rows.filter(isRecord);
    const named = stringList(item.columns);
    const columns = named.length ? named : Object.keys(rows[0] ?? {});
    return columns.length ? [{ columns, rows }] : [];
  });
  const charts = presentations.flatMap((item): ChatChart[] => {
    if (item.render !== "chart" || !Array.isArray(item.rows)) return [];
    if (typeof item.type !== "string" || !CHART_TYPES.has(item.type)) return [];
    if (typeof item.x !== "string" || typeof item.y !== "string" || !item.x || !item.y) return [];
    const columns = stringList(item.columns);
    return [
      {
        type: item.type as ChartType,
        x: item.x,
        y: item.y,
        ...(typeof item.series === "string" && item.series ? { series: item.series } : {}),
        ...(columns.length ? { columns } : {}),
        rows: item.rows.filter(isRecord),
      },
    ];
  });
  const proposal = isRecord(content?.proposal) && nonEmpty(content.proposal.items);
  const inApp = [
    proposal ? "proposed tasks" : null,
    nonEmpty(content?.buyRecommendations) ? "a buy list" : null,
    nonEmpty(content?.proposedSettingChanges) ? "a settings change to confirm" : null,
    isRecord(content?.supplierRowReview) ? "a supplier sheet review" : null,
  ].filter((item): item is string => item !== null);
  return { tables, charts, inApp };
}

/** A chart's structured spec, as a message or run stored it; null when the record is not one. */
export function chartSpec(value: unknown): ChartSpec | null {
  if (!isRecord(value)) return null;
  if (typeof value.type !== "string" || !CHART_TYPES.has(value.type)) return null;
  if (typeof value.x !== "string" || typeof value.y !== "string" || !value.x || !value.y) return null;
  if (!Array.isArray(value.rows)) return null;
  const rows = value.rows.filter(isRecord) as Record<string, string | number>[];
  const columns = stringList(value.columns);
  const source = isRecord(value.source) && value.source.app === "excel" ? value.source : null;
  return {
    ...(typeof value.title === "string" && value.title ? { title: value.title } : {}),
    type: value.type as ChartType,
    x: value.x,
    y: value.y,
    ...(typeof value.series === "string" && value.series ? { series: value.series } : {}),
    columns: columns.length
      ? columns
      : [...new Set([value.x, value.series, value.y].filter((c): c is string => typeof c === "string" && Boolean(c)))],
    rows,
    ...(source
      ? {
          source: {
            app: "excel" as const,
            sheet: typeof source.sheet === "string" ? source.sheet : null,
            address: typeof source.address === "string" ? source.address : null,
          },
        }
      : {}),
  };
}

/** The attachment a person's turn carried, from a message's content or a run row. */
export function turnAttachment(value: unknown): ChatTurnAttachment | null {
  if (!isRecord(value) || typeof value.filename !== "string") return null;
  if (value.kind === "spreadsheet") {
    return {
      kind: "spreadsheet",
      filename: value.filename,
      totalRows: typeof value.totalRows === "number" ? value.totalRows : 0,
    };
  }
  if (value.kind === "image" && typeof value.fileId === "string") {
    return { kind: "image", fileId: value.fileId, filename: value.filename };
  }
  if (value.kind === "chart") {
    const chart = chartSpec(value.chart);
    if (chart)
      return {
        kind: "chart",
        fileId: typeof value.fileId === "string" ? value.fileId : null,
        filename: value.filename,
        chart,
      };
  }
  return null;
}

function chatRun(value: unknown): ChatRun | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.sessionId !== "string") return null;
  const status =
    typeof value.status === "string" && RUN_STATUSES.has(value.status) ? (value.status as ChatRunStatus) : "running";
  return {
    id: value.id,
    sessionId: value.sessionId,
    status,
    prompt: typeof value.prompt === "string" ? value.prompt : "",
    source: typeof value.source === "string" ? value.source : null,
    attachment: turnAttachment(value.attachment),
    startedAt: typeof value.startedAt === "string" ? value.startedAt : "",
    finishedAt: typeof value.finishedAt === "string" ? value.finishedAt : null,
  };
}

function historyMessage(value: Record<string, unknown>): ChatHistoryMessage {
  const role = value.role === "user" || value.role === "assistant" ? value.role : "system";
  return {
    id: typeof value.id === "string" ? value.id : "",
    role,
    turn: typeof value.turn === "number" ? value.turn : 0,
    content: isRecord(value.content) ? value.content : {},
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    source: typeof value.source === "string" ? value.source : null,
    authorName: typeof value.authorName === "string" ? value.authorName : null,
  };
}

/**
 * A conversation's history as turns: each person's message with the answer
 * that followed it. System messages are skipped. A question whose answer is
 * not saved yet (the turn is still running) comes last without one.
 */
export function historyTurns(messages: ChatHistoryMessage[]): ChatHistoryTurn[] {
  const turns: ChatHistoryTurn[] = [];
  for (const message of [...messages].sort((a, b) => a.turn - b.turn || a.createdAt.localeCompare(b.createdAt))) {
    if (message.role === "user") {
      const text = typeof message.content.text === "string" ? message.content.text : "";
      turns.push({
        id: message.id,
        turn: message.turn,
        question: text,
        source: message.source,
        attachment: turnAttachment(message.content.attachment),
        askedAt: message.createdAt,
        extras: { tables: [], charts: [], inApp: [] },
      });
    } else if (message.role === "assistant") {
      const last = turns.at(-1);
      if (!last || last.answer !== undefined) continue;
      const answer = message.content.answer ?? message.content.text;
      last.answer = typeof answer === "string" ? answer : "";
      last.extras = answerExtras(message.content);
    }
  }
  return turns;
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
