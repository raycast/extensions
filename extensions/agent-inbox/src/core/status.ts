import { AgentEvent, Attention, PendingRequest, Session, SessionState } from "./types";

export const TITLE_MAX = 80;

/** Turn a prompt or message into a one-line title. */
export function toTitle(text: string | undefined): string {
  if (!text) return "";
  const line = text
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  const clean = line.replace(/\s+/g, " ").replace(/^[#>*\-\s]+/, "");
  return clean.length > TITLE_MAX ? clean.slice(0, TITLE_MAX - 1) + "…" : clean;
}

/** The last sentence of an agent message, single line, for the detail view and notifications. */
export function lastSentence(text: string | undefined, max = 240): string {
  if (!text) return "";
  const flat = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!flat) return "";
  if (flat.length <= max) return flat;
  return "…" + flat.slice(flat.length - max + 1);
}

/** Heuristic: a turn that ends with a question is waiting for the user, not finished. */
export function endsWithQuestion(text: string | undefined): boolean {
  if (!text) return false;
  const t = text
    .replace(/```[\s\S]*?```/g, "")
    .trim()
    .replace(/[\s*_`)"'」』）]+$/u, "");
  return /[?？]$/u.test(t);
}

export interface Transition {
  next: Session;
  /** True when this event should pop a system notification (subscribed session just started waiting). */
  notify: boolean;
  changed: boolean;
}

/** Text is a fallback hint, never evidence that a task is completed. */
export function asksForInput(text: string | undefined): boolean {
  const value = (text ?? "").replace(/```[\s\S]*?```/g, "").trim();
  const tail = value
    .split(/\n\s*\n/)
    .slice(-2)
    .join("\n")
    .split(/\r?\n/)
    .filter((line) => !/^\s*[>|]/.test(line))
    .map((line) => line.trim().replace(/^(?:[-*]\s+|\d+[.)]\s+)?(?:\*\*)?/, ""))
    .join("\n");
  return (
    endsWithQuestion(tail) ||
    /(?:^|[。！.!]\s*|\n)(?:(?:请|需要你|等你|等待你).{0,16}(?:确认|选择|回复|回答|授权|提供|输入)|(?:是否|要不要|你希望|您希望)[^\n]*[?？]|(?:please (?:confirm|choose|select|reply|provide)|waiting for (?:your|user) (?:input|approval|response)|(?:would you|shall I|should I)[^\n]*\?))/iu.test(
      tail,
    )
  );
}

/** Pure reducer. Pending request identity is independent of the current turn's phase. */
export function applyEvent(prev: Session | undefined, ev: AgentEvent): Transition | null {
  if (!Number.isFinite(ev.at) || ev.at < 0) return null;
  const previous: SessionState = prev?.state ?? {
    phase: prev?.status === "needs_input" ? "running" : (prev?.status ?? "idle"),
    at: prev && !["idle", "ready"].includes(prev.status) && !ev.snapshotComplete ? prev.updatedAt : 0,
    source: "legacy",
    pending:
      prev?.status === "needs_input" ? [{ id: "legacy", attention: prev.attention ?? "input", at: prev.updatedAt, inferred: true }] : [],
    resolved: [],
  };
  const requestLifecycle = !!ev.requestIds?.length && ["needs_input", "resolved", "tool"].includes(ev.type);
  if (ev.at < previous.at && ev.type !== "snapshot" && !requestLifecycle) return null;
  const startsTurn = ev.type === "progress" || (ev.type === "snapshot" && (ev.snapshot?.turnStartedAt ?? 0) > previous.at);
  const otherTurn = !!ev.turnId && !!previous.turnId && ev.turnId !== previous.turnId && !startsTurn;
  if (otherTurn && !requestLifecycle && ev.type !== "snapshot") return null;
  // Legacy notify cannot end an identified, newer turn. The rollout/Stop hook supplies its end.
  if (ev.source === "notify" && previous.turnId && !ev.turnId && ev.type === "stopped") return null;
  const state: SessionState = { ...previous, pending: [...previous.pending], resolved: [...previous.resolved] };
  const ids = ev.requestIds ?? [];
  switch (ev.type) {
    case "snapshot": {
      const observed = ev.snapshot;
      if (ev.snapshotComplete && !prev?.state) state.pending = [];
      if (!observed) return null;
      // Request answers remain valid even when a newer hook has advanced the turn.
      state.resolved = [...new Set([...state.resolved, ...observed.resolved])].slice(-256);
      state.pending = state.pending.filter((request) => !state.resolved.includes(request.id));
      const relevant = observed.pending.filter(
        (request) => (!request.inferred || request.at >= (previous.turnStartedAt ?? 0)) && !state.resolved.includes(request.id),
      );
      if (ev.at < previous.at || otherTurn) {
        // A stop hook can arrive before the collector sees its unanswered question.
        // Older snapshots may add that evidence, but cannot roll back the current phase.
        for (const request of relevant) if (!state.pending.some((r) => r.id === request.id)) state.pending.push(request);
      } else {
        state.phase = observed.phase;
        state.turnId = observed.turnId ?? state.turnId;
        state.turnStartedAt = observed.turnStartedAt ?? state.turnStartedAt;
        state.pending = state.pending.filter(
          (r) => !state.resolved.includes(r.id) && (!r.inferred || r.at >= (observed.turnStartedAt ?? 0)),
        );
        for (const request of relevant) if (!state.pending.some((r) => r.id === request.id)) state.pending.push(request);
      }
      break;
    }
    case "started":
      break;
    case "progress":
      state.phase = "running";
      state.pending = state.pending.filter((request) => !request.inferred);
      state.turnId = ev.turnId;
      state.turnStartedAt = ev.at;
      break;
    case "tool":
    case "resolved": {
      // Unrelated tool activity must not resolve a prompt/approval.
      const matched = state.pending.filter((request) => ids.includes(request.id));
      state.pending = state.pending.filter((request) => !ids.includes(request.id));
      state.resolved = [...new Set([...state.resolved, ...ids])].slice(-256);
      if (ev.type === "tool" && ev.at >= previous.at && (!ev.turnId || !previous.turnId || ev.turnId === previous.turnId))
        state.phase = "running";
      else if (!matched.length && !ids.length) return null;
      break;
    }
    case "needs_input":
    case "failed":
    case "quota":
    case "interrupted": {
      const attention = ev.type === "needs_input" ? (ev.attention ?? "input") : ev.type;
      // Claude can send a generic permission_prompt notification for AskUserQuestion.
      // Unscoped input reminders must not duplicate a tracked question/approval or
      // remain pending after its tool result resolves the real request.
      const samePrompt = (other: Attention) =>
        other === attention ||
        (["input", "question", "permission"].includes(attention) && ["input", "question", "permission"].includes(other));
      if (!ids.length && state.pending.some((request) => !request.inferred && samePrompt(request.attention))) break;
      if (ids.length) state.pending = state.pending.filter((request) => !request.inferred || !samePrompt(request.attention));
      const requestIds = ids.length ? ids : [`hint:${attention}`];
      for (const id of requestIds) {
        if (state.resolved.includes(id) || state.pending.some((request) => request.id === id)) continue;
        state.pending.push({ id, attention, at: ev.at, turnId: ev.turnId, inferred: ev.inferred ?? !ids.length });
      }
      if (ev.type !== "needs_input") state.phase = "unknown";
      break;
    }
    case "stopped":
      state.phase = "ready";
      if (ev.attention === "question" && state.pending.length === 0) {
        state.pending.push({ id: "hint:question", attention: "question", at: ev.at, turnId: ev.turnId, inferred: true });
      }
      break;
    case "completed":
      state.phase = "done";
      break;
    case "ended":
      if (state.phase === "running") state.phase = "unknown";
      break;
  }
  state.at = Math.max(previous.at, ev.at);
  state.source = ev.source ?? "external";
  if (!state.turnId && ev.turnId && ev.at >= previous.at) state.turnId = ev.turnId;
  const pending = [...state.pending].sort((a, b) => priority(b) - priority(a) || b.at - a.at);
  const status = pending.length ? "needs_input" : state.phase;
  const attention = pending[0]?.attention ?? null;
  const base: Session = prev ?? {
    agent: ev.agent,
    sessionId: ev.sessionId,
    host: ev.host ?? "cli",
    title: "",
    cwd: ev.cwd ?? "",
    status: "idle",
    attention: null,
    summary: "",
    locator: {},
    subscribed: false,
    handledAt: null,
    startedAt: ev.at,
    updatedAt: ev.at,
    transcriptPath: "",
  };
  const newRequest = state.pending.some((r) => !previous.pending.some((p) => p.id === r.id || (p.inferred && p.attention === r.attention)));
  const statusChanged = base.status !== status || base.attention !== attention || newRequest;
  const next: Session = {
    ...base,
    host: ev.host ?? base.host,
    cwd: ev.cwd || base.cwd,
    title: base.title || toTitle(ev.title),
    summary: ev.summary ? lastSentence(ev.summary) : base.summary,
    status,
    attention,
    state,
    locator: { ...base.locator, ...stripEmpty(ev.locator) },
    transcriptPath: ev.transcriptPath || base.transcriptPath,
    handledAt: statusChanged ? null : base.handledAt,
    updatedAt: Math.max(base.updatedAt, ev.at),
  };
  return { next, notify: next.subscribed && status === "needs_input" && statusChanged, changed: true };
}

function priority(request: PendingRequest): number {
  return request.attention === "permission" ? 3 : request.inferred ? 1 : 2;
}

function stripEmpty<T extends object>(o: T | undefined): Partial<T> {
  if (!o) return {};
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export type InboxSection = "needs_input" | "subscribed" | "done";

export type SessionFilter = "all" | "subscribed" | "needs_input" | "done";

/** Subscription and status filters overlap; the default view keeps every session discoverable. */
export function filterSessions(sessions: Session[], filter: SessionFilter): Session[] {
  if (filter === "all") return sessions;
  return sessions.filter((s) => (filter === "subscribed" ? s.subscribed : s.status === filter));
}

/**
 * Inbox rules:
 * - only subscribed sessions, including history without a live status
 * - waiting for input is always on top
 * - handled sessions leave the inbox until their status changes
 */
export function inboxSection(s: Session): InboxSection | null {
  if (!s.subscribed || s.handledAt !== null) return null;
  if (s.status === "needs_input") return "needs_input";
  if (s.status === "done") return "done";
  return "subscribed";
}

export function groupInbox(sessions: Session[]): Record<InboxSection, Session[]> {
  const groups: Record<InboxSection, Session[]> = { needs_input: [], subscribed: [], done: [] };
  for (const s of sessions) {
    const sec = inboxSection(s);
    if (sec) groups[sec].push(s);
  }
  groups.needs_input.sort((a, b) => b.updatedAt - a.updatedAt);
  groups.subscribed.sort((a, b) => b.updatedAt - a.updatedAt);
  groups.done.sort((a, b) => b.updatedAt - a.updatedAt);
  return groups;
}

/** Menu bar count: subscribed sessions waiting for input. */
export function waitingCount(sessions: Session[]): number {
  return sessions.filter((s) => s.subscribed && s.handledAt === null && s.status === "needs_input").length;
}
