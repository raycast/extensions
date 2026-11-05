import { AgentEvent } from "../types";

export const string = (value: unknown): string => (typeof value === "string" ? value : "");
export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export function eventTime(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Date.parse(string(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function hookIdentity(payload: Record<string, unknown>, now: number): Partial<AgentEvent> {
  return {
    source: "hook",
    at: eventTime(payload.timestamp, now),
    turnId: string(payload.turn_id) || undefined,
    eventId: string(payload.event_id) || undefined,
  };
}

export function requestIds(payload: Record<string, unknown>): string[] {
  const id = string(payload.tool_use_id) || string(payload.call_id) || string(payload.request_id);
  return id ? [id] : [];
}

export function questionTool(name: string): boolean {
  return /(?:^|[._])(?:AskUserQuestion|request_user_input(?:_async)?|AskUser)(?:$)/i.test(name);
}

/** Async transport acknowledgement is not a user's answer. */
export function isAsyncAcknowledgement(value: unknown): boolean {
  let output = value;
  if (typeof output === "string") {
    try {
      output = JSON.parse(output);
    } catch {
      return false;
    }
  }
  return object(output).accepted === true && !object(output).answers;
}
