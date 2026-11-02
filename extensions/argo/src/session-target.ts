import type { HcTarget, HcEntry } from "./herdr.js";

export type ConversationTarget = { profileId: string; bindingId: string; connectionKey: string };
export type SessionTarget = ConversationTarget | HcTarget;
export const LAST_CONVERSATION_KEY = "last-conversation-v1";

// Legacy references deliberately remain valid. HC never falls back to an active bridge or machine alias.
export function parseSessionTarget(raw: string): SessionTarget {
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid recent session reference");
  const bounded = (v: unknown, length: number): v is string => typeof v === "string" && !!v && v.length <= length;
  if (value.kind === "hc") {
    if (
      !bounded(value.socketPath, 4096) ||
      !value.socketPath.startsWith("/") ||
      [...(value.socketPath as string)].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
      ![value.hostCoreId, value.coreId].every((v) => bounded(v, 128) && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(v)) ||
      !bounded(value.terminalId, 10) ||
      !/^t[1-9][0-9bcdfghjkmnpqrstvwxyz]{0,7}$/.test(value.terminalId)
    )
      throw new Error("Invalid recent Herdr reference");
    return {
      kind: "hc",
      socketPath: value.socketPath,
      hostCoreId: value.hostCoreId,
      coreId: value.coreId,
      terminalId: value.terminalId,
    };
  }
  if (value.kind !== undefined && value.kind !== "argo") throw new Error("Unknown session source");
  if (
    !bounded(value.profileId, 100) ||
    !bounded(value.bindingId, 200) ||
    typeof value.connectionKey !== "string" ||
    !/^[a-f0-9]{24}$/.test(value.connectionKey)
  )
    throw new Error("Invalid recent conversation reference");
  return { profileId: value.profileId, bindingId: value.bindingId, connectionKey: value.connectionKey };
}

export function hcStatus(entry: HcEntry): string {
  const terminal = entry.terminal;
  if (!entry.connected) return "Offline";
  if (["finished", "lost", "removed"].includes(terminal.state))
    return terminal.state === "finished" ? "Finished" : "Unavailable";
  if (!terminal.reported || !terminal.status) return "Unknown";
  if (terminal.status.state === "blocked") return "Needs Input";
  if (terminal.status.state === "error") return "Needs Attention";
  if (terminal.status.state === "idle") return "Idle";
  if (terminal.status.state === "working") return "Working";
  return "Unknown";
}
export function hcGroup(entry: HcEntry): "Needs Attention" | "Online" | "Offline" {
  const status = hcStatus(entry);
  return ["Offline", "Finished", "Unavailable"].includes(status)
    ? "Offline"
    : ["Needs Input", "Needs Attention"].includes(status)
      ? "Needs Attention"
      : "Online";
}
