import { setTimeout as sleep } from "node:timers/promises";
import type { ChoiceEffect } from "./types";

export interface SuggesterItem {
  title: string;
  value: string;
}

export interface CheckboxItem {
  title: string;
  value: string;
  checked: boolean;
}

export interface FormField {
  id: string;
  label: string;
  type:
    | "text"
    | "number"
    | "textarea"
    | "dropdown"
    | "date"
    | "suggester"
    | "slider"
    | "field-suggest";
  placeholder?: string;
  defaultValue?: string;
  description?: string;
  options?: string[];
  /** Labels shown for `options` (e.g. note names for note paths). */
  displayOptions?: string[];
  dateFormat?: string;
  optional?: boolean;
  numericConfig?: { min?: number; max?: number; step?: number };
  suggesterConfig?: { allowCustomInput?: boolean; multiSelect?: boolean };
  /** `"file"` on a suggester that picks notes. Sent by QuickAdd 2.31.0+. */
  picker?: "file";
}

type KnownPrompt =
  | {
      type: "suggester";
      placeholder?: string;
      allowCustomInput: boolean;
      items: SuggesterItem[];
    }
  | {
      type: "multiselect";
      placeholder?: string;
      allowCustomInput: boolean;
      items: SuggesterItem[];
      preselected: string[];
    }
  | {
      type: "input";
      header: string;
      placeholder?: string;
      defaultValue?: string;
      multiline: boolean;
    }
  | {
      type: "date";
      header: string;
      placeholder?: string;
      defaultValue?: string;
      dateFormat?: string;
      withTime?: boolean;
    }
  | { type: "confirm"; header: string; text?: string }
  | { type: "checkbox"; header?: string; items: CheckboxItem[] }
  | { type: "info"; header: string; text: string[] }
  | { type: "form"; fields: FormField[] };

/** `unknown` stands for a prompt type added by a newer QuickAdd. */
export type PromptSpec = KnownPrompt | { type: "unknown"; wireType: string };

const KNOWN_PROMPT_TYPES: Record<KnownPrompt["type"], true> = {
  suggester: true,
  multiselect: true,
  input: true,
  date: true,
  confirm: true,
  checkbox: true,
  info: true,
  form: true,
};

type WirePrompt = KnownPrompt | { type: string };

function isKnownPrompt(prompt: WirePrompt): prompt is KnownPrompt {
  return Object.hasOwn(KNOWN_PROMPT_TYPES, prompt.type);
}

export type ReplyValue =
  string | string[] | boolean | Record<string, string | string[]>;

export interface DoneResult {
  effect?: ChoiceEffect;
  /** Vault-relative path of the file the run created or changed. */
  file?: string;
}

export type SessionEvent =
  | { kind: "prompt"; requestId: string; prompt: PromptSpec }
  | { kind: "done"; result: DoneResult }
  | { kind: "error"; error: string }
  | { kind: "idle" };

export type RunEvent = Exclude<SessionEvent, { kind: "idle" }>;

type WireEvent =
  | Exclude<SessionEvent, { kind: "prompt" }>
  | { kind: "prompt"; requestId: string; prompt: WirePrompt };

export interface InteractiveSession {
  host: string;
  port: number;
  sessionId: string;
  token: string;
}

export interface PendingPrompt {
  requestId: string;
  prompt: PromptSpec;
}

export type SessionState =
  | { state: "connecting" }
  | { state: "prompt"; pending: PendingPrompt }
  | { state: "working" }
  | { state: "done"; result: DoneResult }
  | { state: "failed"; message: string }
  | { state: "cancelled" };

export type SessionEnd = Extract<SessionState, { state: "done" | "cancelled" }>;

/** How a caller that started polling hands the run to the session view. */
export type Handoff =
  | { kind: "prompt"; pending: PendingPrompt }
  | { kind: "poll"; next: Promise<RunEvent>; polls: AbortController };

export function initialState(handoff?: Handoff): SessionState {
  return handoff?.kind === "prompt"
    ? { state: "prompt", pending: handoff.pending }
    : { state: "connecting" };
}

export interface SessionDriver {
  answer(value: ReplyValue): void;
  cancel(): void;
  cancelQuietly(): void;
}

export function doneMessage(
  choiceName: string,
  { effect, file }: DoneResult,
): string {
  if (file && effect === "created") return `Created ${file}`;
  if (file && effect === "changed") return `Added to ${file}`;
  return `Ran ${choiceName}`;
}

function url(s: InteractiveSession, path: string): string {
  return `http://${s.host}:${s.port}${path}?session=${encodeURIComponent(s.sessionId)}&token=${encodeURIComponent(s.token)}`;
}

export async function nextEvent(
  s: InteractiveSession,
  signal?: AbortSignal,
): Promise<RunEvent> {
  for (;;) {
    const res = await fetch(url(s, "/poll"), { signal });
    if (!res.ok) {
      throw new Error(
        `Interactive session poll failed (${res.status}). The run may have ended.`,
      );
    }
    const event = (await res.json()) as WireEvent;
    if (event.kind === "idle") continue;
    if (event.kind !== "prompt") return event;
    const { requestId, prompt } = event;
    return {
      kind: "prompt",
      requestId,
      prompt: isKnownPrompt(prompt)
        ? prompt
        : { type: "unknown", wireType: prompt.type },
    };
  }
}

/** The run's end if it comes within `ms`, otherwise what to hand to the session view. */
export async function firstEvent(
  s: InteractiveSession,
  ms: number,
): Promise<Exclude<RunEvent, { kind: "prompt" }> | Handoff> {
  const polls = new AbortController();
  const next = nextEvent(s, polls.signal);
  const event = await Promise.race([next, sleep(ms, undefined)]);
  if (!event) return { kind: "poll", next, polls };
  if (event.kind !== "prompt") return event;
  const { requestId, prompt } = event;
  return { kind: "prompt", pending: { requestId, prompt } };
}

async function replyToPrompt(
  s: InteractiveSession,
  requestId: string,
  value: ReplyValue,
): Promise<void> {
  const res = await fetch(url(s, "/reply"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId, value }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Reply failed (${res.status}).`);
  }
}

/**
 * Rejects every open prompt and any the run raises later (QuickAdd >= 2.20). A run
 * that is mid-work stops at its next prompt.
 */
async function abortSession(s: InteractiveSession): Promise<void> {
  await fetch(url(s, "/abort"), { method: "POST" });
}

/** Polling continues while a prompt is open: it is the server's only sign that the client is still there. */
export function driveSession(
  session: InteractiveSession,
  {
    handoff,
    onChange,
  }: { handoff?: Handoff; onChange: (state: SessionState) => void },
): SessionDriver {
  let current = initialState(handoff);
  const polls =
    handoff?.kind === "poll" ? handoff.polls : new AbortController();
  const isLive = () =>
    current.state === "connecting" ||
    current.state === "prompt" ||
    current.state === "working";
  const enter = (state: SessionState) => {
    if (!isLive()) return;
    current = state;
    onChange(state);
  };
  const end = (state: SessionState, report = true) => {
    if (!isLive()) return;
    current = state;
    if (report) onChange(state);
    polls.abort();
    void abortSession(session).catch(() => {});
  };
  // A poll or reply that threw leaves a run nobody can drive, so release its prompt.
  const fail = (error: unknown) =>
    end({
      state: "failed",
      message: error instanceof Error ? error.message : String(error),
    });

  void (async () => {
    let pending =
      handoff?.kind === "poll"
        ? handoff.next
        : nextEvent(session, polls.signal);
    for (;;) {
      const event = await pending;
      if (event.kind === "prompt") {
        const { requestId, prompt } = event;
        enter({ state: "prompt", pending: { requestId, prompt } });
      } else if (event.kind === "done") {
        enter({ state: "done", result: event.result });
      } else {
        enter({ state: "failed", message: event.error });
      }
      if (!isLive()) return;
      pending = nextEvent(session, polls.signal);
    }
  })().catch(fail);

  return {
    answer(value) {
      if (current.state !== "prompt") return;
      const { requestId } = current.pending;
      enter({ state: "working" });
      replyToPrompt(session, requestId, value).catch(fail);
    },
    cancel: () => end({ state: "cancelled" }),
    cancelQuietly: () => end({ state: "cancelled" }, false),
  };
}
