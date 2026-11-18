/** One search result, as `digup search-service` describes it (DigUp's SearchService.swift, `hitFields`). */
export interface Hit {
  path: string;
  /** screenshot, image, pdf, doc, audio, video or code; a newer DigUp may send others. */
  kind: string;
  /** name, image, ocr, page, page_image, chunk, audio, frame, lines or cells. */
  segment: string;
  segmentId: number;
  score: number;
  /** Seconds since 1970. */
  modified: number;
  size: number;
  info: Record<string, string>;
  /** How far the meaning match stands out; from 2 it counts as a match by meaning. */
  z?: number;
  cosine?: number;
  keywordRank?: number;
  /** A PDF's page, a recording's second, or a stretch of code's first line or cell. */
  loc?: number;
  locEnd?: number;
  /** The line a name is defined on, or where the query's words are. */
  focus?: number;
  /** Text around the words keyword search found, each marked « ». */
  excerpt?: string;
}

export interface SearchReply {
  hits: Hit[];
  /** The first `strong` hits are the good ones; the rest are weaker matches. */
  strong: number;
  /** False when only words were matched: while typing, or when the model isn't there. */
  meaning: boolean;
  warning?: string;
}

export type EncoderState = "stopped" | "starting" | "ready" | "unavailable";

export type ServiceEvent =
  | { event: "ready"; index: string }
  | { event: "encoder"; state: EncoderState; error?: string }
  | { event: "other"; name: string };

export type ParsedLine =
  | { type: "reply"; id: number; body: Record<string, unknown> }
  | { type: "event"; event: ServiceEvent }
  | { type: "junk" };

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly kind: "request" | "exited" | "timeout",
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const ENCODER_STATES: readonly string[] = ["stopped", "starting", "ready", "unavailable"];

/** One line of the helper's output. Anything that isn't a reply or an event is junk, and ignored. */
export function parseLine(line: string): ParsedLine {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return { type: "junk" };
  }
  if (!isRecord(value)) return { type: "junk" };
  if (typeof value.id === "number") return { type: "reply", id: value.id, body: value };
  const name = text(value.event);
  if (!name) return { type: "junk" };
  if (name === "ready") return { type: "event", event: { event: "ready", index: text(value.index) ?? "" } };
  const state = text(value.state);
  if (name === "encoder" && state && ENCODER_STATES.includes(state)) {
    const event: ServiceEvent = { event: "encoder", state: state as EncoderState };
    const error = text(value.error);
    if (error) event.error = error;
    return { type: "event", event };
  }
  return { type: "event", event: { event: "other", name } };
}

type OptionalNumber = "z" | "cosine" | "keywordRank" | "loc" | "locEnd" | "focus";

/** A hit, or null when it has no path. Fields a newer DigUp adds are ignored; missing ones get defaults. */
export function parseHit(raw: unknown): Hit | null {
  if (!isRecord(raw)) return null;
  const path = text(raw.path);
  if (!path) return null;
  const info: Record<string, string> = {};
  if (isRecord(raw.info)) {
    for (const [key, value] of Object.entries(raw.info)) {
      if (typeof value === "string" || typeof value === "number") info[key] = String(value);
    }
  }
  const hit: Hit = {
    path,
    kind: text(raw.kind) ?? "file",
    segment: text(raw.segment) ?? "name",
    segmentId: number(raw.segment_id) ?? -1,
    score: number(raw.score) ?? 0,
    modified: number(raw.modified) ?? 0,
    size: number(raw.size) ?? 0,
    info,
  };
  const optional: [OptionalNumber, unknown][] = [
    ["z", raw.z],
    ["cosine", raw.cosine],
    ["keywordRank", raw.keyword_rank],
    ["loc", raw.loc],
    ["locEnd", raw.loc_end],
    ["focus", raw.focus],
  ];
  for (const [key, value] of optional) {
    const parsed = number(value);
    if (parsed !== undefined) hit[key] = parsed;
  }
  const excerpt = text(raw.excerpt);
  if (excerpt) hit.excerpt = excerpt;
  return hit;
}

/** The reply to a `search` request. Throws `ServiceError` when the helper refused it. */
export function parseSearchReply(body: Record<string, unknown>): SearchReply {
  if (body.ok === false) throw new ServiceError(text(body.error) ?? "DigUp could not run this search.", "request");
  const hits = Array.isArray(body.hits) ? body.hits.map(parseHit).filter((hit): hit is Hit => hit !== null) : [];
  const strong = Math.min(Math.max(0, Math.trunc(number(body.strong) ?? hits.length)), hits.length);
  const reply: SearchReply = { hits, strong, meaning: body.meaning === true };
  const warning = text(body.warning);
  if (warning) reply.warning = warning;
  return reply;
}
