export type CliListeningMode = "off" | "transparency" | "adaptive" | "noise-cancellation";

export type CliResult = "ok" | "error" | "no-op" | "interrupted";

export interface CliResourcePayload {
  result: Exclude<CliResult, "interrupted">;
  device: string | null;
  error?: string;
  listeningMode?: string | null;
  conversationAwareness?: string | null;
  supportedListeningModes?: string[];
}

export interface CliInterruptedPayload {
  result: "interrupted";
  signal: number;
  device?: string | null;
  listeningMode?: string | null;
  conversationAwareness?: string | null;
  supportedListeningModes?: string[];
}

/**
 * Structured output emitted by the pods-control CLI with `--json`.
 * Command-specific state fields are null when unavailable or on errors.
 */
export type CliPayload = CliResourcePayload | CliInterruptedPayload;
