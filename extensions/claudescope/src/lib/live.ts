import type { LiveFinished, LiveResponse, LiveRun, LiveSession, LiveSessionMeta, LiveState } from "./claudescope";

export const STUCK_AFTER_MS = 3 * 60_000;
const TOOL_NAME_LENGTH = 24;
const TOOL_INPUT_LINES = 4;
const TOOL_INPUT_CHARACTERS = 400;
const DETAIL_RUNS = 20;
const RUN_INPUT_LINES = 3;
const RUN_INPUT_CHARACTERS = 300;
const LAST_TEXT_LINES = 12;
const LAST_TEXT_CHARACTERS = 1200;
const RUN_FIELD_LENGTH = 120;
const TOOL_INPUT_FIELDS = ["command", "pattern", "query", "url", "description", "prompt", "file_path"];

export type LiveSectionId = "idle" | "working" | "other";

export interface LiveSections {
  idle: LiveSession[];
  working: LiveSession[];
  other: LiveSession[];
  finished: LiveFinished[];
}

export function liveSection(state: LiveState): LiveSectionId {
  if (state === "idle") return "idle";
  if (state === "working" || state === "tool" || state === "subagents") return "working";
  return "other";
}

/** Split a response into the view's sections, keeping only one agent unless `agent` is undefined. */
export function groupLiveSessions(response: LiveResponse, agent?: string): LiveSections {
  const matches = (meta: LiveSessionMeta) => agent === undefined || meta.connectorId === agent;
  const sessions = response.sessions.filter((session) => matches(session.meta));
  const liveIds = new Set(response.sessions.map((session) => session.meta.id));
  return {
    idle: sessions
      .filter((session) => liveSection(session.state) === "idle")
      .sort((left, right) => stateSince(left) - stateSince(right)),
    working: sessions.filter((session) => liveSection(session.state) === "working"),
    other: sessions.filter((session) => liveSection(session.state) === "other"),
    // A session id must stay unique across sections so Raycast keeps the selection.
    finished: response.finished.filter((finished) => matches(finished.meta) && !liveIds.has(finished.meta.id)),
  };
}

function stateSince(session: LiveSession): number {
  return session.stateSinceMs ?? session.lastWriteMs;
}

export function formatElapsed(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
}

export function stateElapsed(session: LiveSession, now: number): string {
  return formatElapsed(now - stateSince(session));
}

export function isPossiblyStuck(session: LiveSession, now: number): boolean {
  return liveSection(session.state) === "working" && now - session.lastWriteMs > STUCK_AFTER_MS;
}

export function stuckTooltip(session: LiveSession, now: number): string {
  return `Possibly stuck — no output for ${formatElapsed(now - session.lastWriteMs)}`;
}

/** `mcp__grafana__query_loki_logs` → `query_loki_logs`, capped for the row. */
export function shortToolName(name: string): string {
  const short = name.split("__").filter(Boolean).at(-1) ?? "";
  if (!short) return "tool";
  return short.length > TOOL_NAME_LENGTH ? `${short.slice(0, TOOL_NAME_LENGTH - 1)}…` : short;
}

export function stateLabel(session: LiveSession, now: number): string {
  const elapsed = stateElapsed(session, now);
  switch (session.state) {
    case "idle":
      return `Idle · ${elapsed}`;
    case "working":
      return `Working · ${elapsed}`;
    case "tool":
      return `Running ${shortToolName(session.openTool?.name ?? "")} · ${elapsed}`;
    case "subagents":
      return `Subagents running · ${elapsed}`;
    case "ended":
      return "Ended";
    default:
      return "Unknown";
  }
}

export function finishedLabel(finished: LiveFinished, now: number): string {
  return `${formatElapsed(now - finished.lastWriteMs)} ago`;
}

/** Agents that record no usage, or record it only at session end, must never read as $0. */
export function costText(
  totalCostUsd: number,
  usageGranularity: string,
  ended: boolean,
  formatCost: (cost: number) => string,
): string {
  if (usageGranularity === "none") return "—";
  if (usageGranularity === "session-level" && !ended) return "at end";
  return formatCost(totalCostUsd);
}

export function costTooltip(usageGranularity: string, ended: boolean): string {
  if (usageGranularity === "none") return "This agent records no token usage";
  if (usageGranularity === "session-level" && !ended) return "This agent records usage when the session ends";
  return "Estimated cost";
}

export function contextText(meta: LiveSessionMeta, formatTokens: (tokens: number) => string): string | undefined {
  const { contextTokens, contextWindow } = meta;
  if (contextTokens === undefined) return undefined;
  if (contextWindow === undefined || contextWindow <= 0) return formatTokens(contextTokens);
  const percent = Math.round((contextTokens / contextWindow) * 100);
  return `${formatTokens(contextTokens)} of ${formatTokens(contextWindow)} · ${percent}%`;
}

/** The most telling field of a tool call's input, untruncated. */
export function toolInputText(input: unknown): string {
  if (typeof input === "string") return input;
  if (input === undefined || input === null) return "";
  if (typeof input === "object") {
    const fields = input as Record<string, unknown>;
    for (const field of TOOL_INPUT_FIELDS) {
      const value = fields[field];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return JSON.stringify(input, null, 2) ?? String(input);
}

export interface ClampedText {
  text: string;
  hiddenLines: number;
  hiddenCharacters: number;
}

export function clampText(
  value: string,
  maxLines = TOOL_INPUT_LINES,
  maxCharacters = TOOL_INPUT_CHARACTERS,
): ClampedText {
  const text = value.replace(/\s+$/, "");
  const lines = text.split("\n");
  let shown = lines.slice(0, maxLines).join("\n");
  if (shown.length > maxCharacters) {
    shown = shown.slice(0, maxCharacters);
    // Never leave half of a surrogate pair at the cut.
    if (/[\uD800-\uDBFF]$/.test(shown)) shown = shown.slice(0, -1);
    shown = shown.replace(/\n$/, "");
  }
  return {
    text: shown,
    hiddenLines: lines.length - shown.split("\n").length,
    hiddenCharacters: text.length - shown.length,
  };
}

function clampedRemainder(clamped: ClampedText): string | undefined {
  if (clamped.hiddenLines > 0) return `… ${clamped.hiddenLines} more ${clamped.hiddenLines === 1 ? "line" : "lines"}`;
  if (clamped.hiddenCharacters > 0) return `… ${clamped.hiddenCharacters} more characters`;
  return undefined;
}

/** Wrap untrusted text in a fence longer than any backtick run inside it, so
 * nothing in a transcript can close the fence or render as markdown. */
export function codeFence(content: string): string {
  let longestRun = 0;
  for (const match of content.matchAll(/`+/g)) longestRun = Math.max(longestRun, match[0].length);
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${content}\n${fence}`;
}

function singleLine(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > RUN_FIELD_LENGTH ? `${compact.slice(0, RUN_FIELD_LENGTH - 1)}…` : compact;
}

function runTitle(run: LiveRun): string {
  return [singleLine(run.agentType) || "subagent", singleLine(run.description)].filter(Boolean).join(" — ");
}

/** What an active run is doing right now: its open tool and that call's input. */
function activeRunBlock(run: LiveRun, now: number): string {
  const since = run.openTool?.sinceMs ?? run.lastItemMs;
  const elapsed = since === undefined ? "" : ` · ${formatElapsed(now - since)}`;
  const lines = [runTitle(run)];
  if (run.openTool) {
    lines.push(`Running ${shortToolName(run.openTool.name)}${elapsed}`);
    const clamped = clampText(toolInputText(run.openTool.input), RUN_INPUT_LINES, RUN_INPUT_CHARACTERS);
    if (clamped.text) lines.push(clamped.text);
    const remainder = clampedRemainder(clamped);
    if (remainder) lines.push(remainder);
  } else {
    lines.push(`${run.state === "idle" ? "Idle" : "Working"}${elapsed}`);
  }
  return codeFence(lines.join("\n"));
}

/** Detail pane markdown. Transcript text appears only inside `codeFence`. */
export function detailMarkdown(session: LiveSession, now: number): string {
  const parts: string[] = [];
  if (session.state === "idle" && session.lastText?.trim()) {
    parts.push("## Last message", codeFence(session.lastText));
  }
  if (session.state === "tool" && session.openTool) {
    const clamped = clampText(toolInputText(session.openTool.input));
    parts.push(`## Running tool · ${stateElapsed(session, now)}`, codeFence(clamped.text));
    const remainder = clampedRemainder(clamped);
    if (remainder) parts.push(remainder);
  }
  if (session.runs.length > 0) {
    parts.push(`## Subagents · ${session.subagents.running} running · ${session.subagents.done} done`);
    const active = session.runs.filter((run) => run.active);
    const done = session.runs.filter((run) => !run.active);
    for (const run of active.slice(0, DETAIL_RUNS)) parts.push(activeRunBlock(run, now));
    const shownDone = done.slice(0, Math.max(0, DETAIL_RUNS - active.length));
    if (shownDone.length > 0) parts.push("### Done", codeFence(shownDone.map(runTitle).join("\n")));
    const hidden = session.runs.length - Math.min(active.length, DETAIL_RUNS) - shownDone.length;
    // Escaped so the line is not read as a list item.
    if (hidden > 0) parts.push(`\\+ ${hidden} more`);
  }
  if (session.state !== "idle" && session.lastText?.trim()) {
    const clamped = clampText(session.lastText, LAST_TEXT_LINES, LAST_TEXT_CHARACTERS);
    parts.push("## Last message", codeFence(clamped.text));
    const remainder = clampedRemainder(clamped);
    if (remainder) parts.push(remainder);
  }
  return parts.join("\n\n");
}
