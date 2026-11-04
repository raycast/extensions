import { Translator } from "./messages";
import { Host, Session } from "./types";
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

export function relativeTime(ts: number, t: Translator, now = Date.now()): string {
  if (!ts) return "—";
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("time.justNow");
  if (min < 60) return t("time.minutes", { n: min });
  const today = startOfDay(now);
  if (ts >= today) return t("time.hours", { n: Math.floor(min / 60) });
  if (ts >= today - 86400000) return t("time.yesterday");
  return t("time.days", { n: Math.max(2, Math.ceil((today - ts) / 86400000)) });
}

/** Running rows show when they started ("14:02 起"); others show how long ago they changed. */
export function rowTime(s: Pick<Session, "status" | "startedAt" | "updatedAt">, t: Translator, now = Date.now()): string {
  if (s.status === "running" && s.startedAt) return t("time.since", { t: hhmm(s.startedAt) });
  return relativeTime(s.updatedAt, t, now);
}

export function absoluteTime(ts: number, t: Translator, now = Date.now()): string {
  if (!ts) return "—";
  if (ts >= startOfDay(now)) return t("time.today", { t: hhmm(ts) });
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${hhmm(ts)}`;
}

export function agentName(agent: string, t: Translator): string {
  if (agent === "claude") return t("agent.claude");
  if (agent === "codex") return t("agent.codex");
  return agent.charAt(0).toUpperCase() + agent.slice(1);
}

export function hostTag(host: Host): string {
  return host === "app" ? "App" : "CLI";
}

export function agentHostLabel(agent: string, host: Host, t: Translator): string {
  return `${agentName(agent, t)} · ${host === "app" ? t("host.app") : t("host.cli")}`;
}

export function statusLabel(session: Session, t: Translator): string {
  if (isClaudeCloudOnly(session)) return t("status.cloudUnavailable");
  if (session.status === "running") return t("section.running");
  if (session.status === "done") return t("section.done");
  if (session.status === "needs_input")
    return session.attention && session.attention !== "input" ? t(`attention.${session.attention}`) : t("section.needsInput");
  return t(`status.${session.status}`);
}
