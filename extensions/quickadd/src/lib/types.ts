/** Types mirroring QuickAdd's CLI JSON envelopes (src/cli/registerQuickAddCliHandlers.ts in the plugin). */

export type ChoiceType = "Template" | "Capture" | "Macro" | "Multi";

/** Sent by QuickAdd >= 2.20. */
export type ChoiceEffect = "created" | "changed" | "unchanged" | "unknown";

export interface ChoiceSummary {
  id: string;
  name: string;
  type: ChoiceType;
  command: boolean;
  /** Full path through Multi folders, e.g. "📥 Add... / ✍ Note (title)". */
  path: string;
  runnable: boolean;
}

export interface ChoiceRef {
  id: string;
  name: string;
  type: ChoiceType;
}

export interface ListResponse {
  ok: boolean;
  command: string;
  error?: string;
  count?: number;
  choices?: ChoiceSummary[];
}

export interface RunResponse {
  ok: boolean;
  command: string;
  error?: string;
  choice?: ChoiceRef;
  /** Vault-relative path of the created/updated file (verified outcome path only). */
  file?: string;
  effect?: ChoiceEffect;
  /** True when the engine confirmed the outcome; false on the legacy void-execute path. */
  verified?: boolean;
  aborted?: boolean;
  durationMs?: number;
}

export interface InteractiveResponse {
  ok: boolean;
  error?: string;
  choice?: ChoiceRef;
  host?: string;
  port?: number;
  sessionId?: string;
  token?: string;
}
