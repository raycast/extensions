export type ClaudeActionOption = {
  id: string;
  label: string;
  detail?: string;
};

export type ClaudeAction = {
  kind: "choice" | "input";
  prompt?: string | null;
  options?: ClaudeActionOption[];
  placeholder?: string;
  submitHint?: string;
};

export type SoundSlot =
  | "running"
  | "needs_input"
  | "success"
  | "failure"
  | "done";

export type ClaudeEvent = {
  source?: string | null;
  hookKey?: string | null;
  returnUrl?: string | null;
  type: SoundSlot;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  timestamp: string;
  durationMs: number | null;
  hookEventName?: string | null;
  notificationType?: string | null;
  soundSlot: SoundSlot;
  action: ClaudeAction | null;
};

export function decodePayload(payload: string): ClaudeEvent {
  const json = Buffer.from(payload, "base64").toString("utf8");
  return JSON.parse(json) as ClaudeEvent;
}
