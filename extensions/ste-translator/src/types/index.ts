export type ContentType = "auto" | "email" | "chat" | "technical-document" | "sop" | "incident-report";

export type ConversionMode = "standard" | "minimal" | "strict";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  auto: "Auto-detect",
  email: "Email",
  chat: "Chat Message",
  "technical-document": "Technical Document",
  sop: "SOP/Runbook",
  "incident-report": "Incident Report",
};

export const MODE_LABELS: Record<ConversionMode, string> = {
  standard: "Standard STE Rewrite",
  minimal: "Minimal Changes",
  strict: "Strict Technical Review",
};

export interface ConversionRequest {
  text: string;
  contentType: ContentType;
  mode: ConversionMode;
  customInstructions?: string;
}

export type WarningSeverity = "error" | "warning" | "info";

export interface ReviewWarning {
  severity: WarningSeverity;
  message: string;
  /** Wording safe to send to an AI provider: refers to protected content by token ID, never by value. */
  repairMessage?: string;
  /** Identifies the underlying problem, independent of the displayed message (counts, wording). */
  key?: string;
  /** How far the result is from the source for this problem. Defaults to 1. A smaller value is better. */
  magnitude?: number;
}

export interface ConversionResult {
  original: string;
  rewritten: string;
  contentType: ContentType;
  mode: ConversionMode;
  warnings: ReviewWarning[];
  /** True when a second pass fixed validation or STE lint problems found in the first rewrite. */
  repaired: boolean;
  /** True when any warning has severity "error" or "warning" or the model asked for human review. */
  needsReview: boolean;
}

export type ConversionErrorKind =
  "empty-input" | "input-too-long" | "unavailable" | "auth" | "timeout" | "empty-response" | "failed";

export class ConversionError extends Error {
  constructor(
    public readonly kind: ConversionErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "ConversionError";
  }
}

export interface CompletionRequest {
  system: string;
  user: string;
  signal?: AbortSignal;
}

export interface AiProvider {
  readonly name: string;
  complete(request: CompletionRequest): Promise<string>;
}
