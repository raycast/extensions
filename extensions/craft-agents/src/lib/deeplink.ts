import { AppError, ErrorCode } from "./errors";
import {
  type ActionKind,
  type CompoundRouteHost,
  type NewChatParams,
  type NewSessionParams,
  NewChatParamsSchema,
  NewSessionParamsSchema,
  type WindowMode,
} from "./deeplink.schema";

const SCHEME = "craftagents://";

function enc(v: string): string {
  return encodeURIComponent(v);
}

function toQueryString(pairs: Array<[string, string | boolean | undefined]>): string {
  const parts: string[] = [];
  for (const [k, v] of pairs) {
    if (v === undefined) continue;
    const value = typeof v === "boolean" ? String(v) : v;
    if (value === "") continue;
    parts.push(`${enc(k)}=${enc(value)}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Build a new-session action URL.
 *
 * All string params are encoded; `badges` is JSON-serialized.
 *
 * @throws AppError(VALIDATION_ERROR) if params fail schema validation
 */
export function buildNewSession(rawParams: NewSessionParams = {}): string {
  const result = NewSessionParamsSchema.safeParse(rawParams);
  if (!result.success) {
    throw AppError.validation(
      `Invalid new-session params: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      result.error.issues,
    );
  }
  const p = result.data;
  const qs = toQueryString([
    ["input", p.input],
    ["send", p.send],
    ["mode", p.mode],
    ["workdir", p.workdir],
    ["model", p.model],
    ["systemPrompt", p.systemPrompt],
    ["name", p.name],
    ["status", p.status],
    ["label", p.label],
    ["badges", p.badges ? JSON.stringify(p.badges) : undefined],
    ["window", p.window],
    ["sidebar", p.sidebar],
  ]);
  return `${SCHEME}action/new-session${qs}`;
}

export function buildNewChat(rawParams: NewChatParams = {}): string {
  const result = NewChatParamsSchema.safeParse(rawParams);
  if (!result.success) {
    throw AppError.validation(
      `Invalid new-chat params: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      result.error.issues,
    );
  }
  const p = result.data;
  const qs = toQueryString([
    ["input", p.input],
    ["send", p.send],
    ["name", p.name],
    ["window", p.window],
  ]);
  return `${SCHEME}action/new-chat${qs}`;
}

/**
 * Build a generic action URL with an id (e.g. flag-session, delete-source, oauth).
 *
 * @throws AppError if the id is missing or empty
 */
export function buildAction(kind: ActionKind, id?: string, window?: WindowMode): string {
  const needsId: ActionKind[] = [
    "resume-sdk-session",
    "rename-session",
    "delete-session",
    "flag-session",
    "unflag-session",
    "oauth",
    "delete-source",
  ];
  if (needsId.includes(kind) && (!id || id.trim() === "")) {
    throw new AppError(ErrorCode.DEEPLINK_BUILD_FAILED, `Action "${kind}" requires an id`);
  }
  const idSegment = id ? `/${enc(id)}` : "";
  const qs = window ? toQueryString([["window", window]]) : "";
  return `${SCHEME}action/${kind}${idSegment}${qs}`;
}

/**
 * Build a compound route URL (navigation).
 *
 * @param host  one of allSessions / flagged / state / sources / settings / skills
 * @param path  optional trailing path segments, e.g. ["session", "abc123"] or ["shortcuts"]
 * @param window optional window mode
 */
export function buildCompound(host: CompoundRouteHost, path: string[] = [], window?: WindowMode): string {
  const segments = path.filter((s) => s && s.trim() !== "").map(enc);
  const pathPart = segments.length ? `/${segments.join("/")}` : "";
  const qs = window ? toQueryString([["window", window]]) : "";
  return `${SCHEME}${host}${pathPart}${qs}`;
}

/**
 * Convenience: navigate to a specific session in the all-sessions list.
 */
export function buildSessionLink(sessionId: string, window?: WindowMode): string {
  if (!sessionId || sessionId.trim() === "") {
    throw new AppError(ErrorCode.DEEPLINK_BUILD_FAILED, "sessionId is required");
  }
  return buildCompound("allSessions", ["session", sessionId], window);
}

/**
 * Convenience: open a source's info page.
 */
export function buildSourceLink(slug: string): string {
  if (!slug || slug.trim() === "") {
    throw new AppError(ErrorCode.DEEPLINK_BUILD_FAILED, "source slug is required");
  }
  return buildCompound("sources", ["source", slug]);
}

/**
 * Convenience: open a skill's info page.
 */
export function buildSkillLink(slug: string): string {
  if (!slug || slug.trim() === "") {
    throw new AppError(ErrorCode.DEEPLINK_BUILD_FAILED, "skill slug is required");
  }
  return buildCompound("skills", ["skill", slug]);
}
