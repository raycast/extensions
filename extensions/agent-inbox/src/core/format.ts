import { Attention, Host, Session } from "./types";
import { isClaudeCloudOnly } from "./claude-desktop";

function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function relativeTime(ts: number, now = Date.now()): string {
  if (!ts) return "—";
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return min + " min ago";
  const today = startOfDay(now);
  if (ts >= today) return Math.floor(min / 60) + " h ago";
  if (ts >= today - 86400000) return "yesterday";
  return Math.max(2, Math.ceil((today - ts) / 86400000)) + " d ago";
}

/** Running rows show when they started ("14:02 起"); others show how long ago they changed. */
export function rowTime(s: Pick<Session, "status" | "startedAt" | "updatedAt">, now = Date.now()): string {
  if (s.status === "running" && s.startedAt) return "since " + hhmm(s.startedAt);
  return relativeTime(s.updatedAt, now);
}

export function absoluteTime(ts: number, now = Date.now()): string {
  if (!ts) return "—";
  if (ts >= startOfDay(now)) return "today " + hhmm(ts);
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${hhmm(ts)}`;
}

export function agentName(agent: string): string {
  if (agent === "claude") return "Claude";
  if (agent === "codex") return "Codex";
  return agent.charAt(0).toUpperCase() + agent.slice(1);
}

export function hostTag(host: Host): string {
  return host === "app" ? "App" : "CLI";
}

export function agentHostLabel(agent: string, host: Host): string {
  return `${agentName(agent)} · ${host === "app" ? "Desktop" : "CLI"}`;
}

export function statusLabel(session: Session): string {
  if (isClaudeCloudOnly(session)) return "Cloud status unavailable";
  if (session.status === "running") return "Running";
  if (session.status === "done") return "Completed";
  if (session.status === "needs_input")
    return session.attention && session.attention !== "input" ? attentionLabel(session.attention) : "Waiting for You";
  return session.status === "ready" ? "Turn ended" : session.status === "unknown" ? "Status unknown" : "Not started";
}

export function attentionLabel(attention: Attention): string {
  switch (attention) {
    case "question":
      return "Asked you a question";
    case "permission":
      return "Needs permission";
    case "failed":
      return "Failed";
    case "quota":
      return "Out of quota";
    case "interrupted":
      return "Interrupted";
    default:
      return "Waiting for input";
  }
}
