import { PROVIDERS, type ProviderId } from "./providers";

export type ProviderErrorReason =
  | "unauthorized"
  | "rate_limited"
  | "limit_reached"
  | "server"
  | "network"
  | "timeout"
  | "bad_response"
  | "model_unavailable"
  | "request_rejected";

const RECOVERABLE_REASONS: ReadonlySet<ProviderErrorReason> = new Set([
  "rate_limited",
  "limit_reached",
  "server",
  "network",
  "timeout",
  "model_unavailable",
]);

const REASON_LABELS: Readonly<Record<ProviderErrorReason, string>> = {
  unauthorized: "invalid API key",
  rate_limited: "rate limit reached",
  limit_reached: "free quota used up",
  server: "provider is down",
  network: "unreachable",
  timeout: "timed out",
  bad_response: "unexpected response",
  model_unavailable: "model unavailable",
  request_rejected: "request rejected",
};

export interface ProviderErrorDetails {
  readonly status?: number | undefined;
  readonly requestId?: string | undefined;
  readonly cause?: unknown;
}

export class ProviderError extends Error {
  override readonly name = "ProviderError";
  readonly provider: ProviderId;
  readonly reason: ProviderErrorReason;
  readonly status: number | undefined;
  readonly requestId: string | undefined;

  constructor(
    provider: ProviderId,
    reason: ProviderErrorReason,
    message: string,
    details: ProviderErrorDetails = {},
  ) {
    super(message, { cause: details.cause });
    this.provider = provider;
    this.reason = reason;
    this.status = details.status;
    this.requestId = details.requestId;
  }

  get recoverable(): boolean {
    return RECOVERABLE_REASONS.has(this.reason);
  }

  get summary(): string {
    const label =
      this.reason === "network" && this.status !== undefined
        ? "response interrupted"
        : REASON_LABELS[this.reason];
    return `${PROVIDERS[this.provider].name}: ${label}`;
  }
}

export class AllProvidersFailedError extends Error {
  override readonly name = "AllProvidersFailedError";
  readonly failures: readonly ProviderError[];

  constructor(failures: readonly ProviderError[]) {
    super(failures.map((failure) => failure.summary).join(" · "));
    this.failures = failures;
  }
}

export class NoProviderConfiguredError extends Error {
  override readonly name = "NoProviderConfiguredError";

  constructor() {
    super("Open Manage Providers to add a provider and choose an enabled primary provider.");
  }
}

export class EmptyTextError extends Error {
  override readonly name = "EmptyTextError";

  constructor() {
    super("There is no text to translate.");
  }
}

export class InvalidSettingsError extends Error {
  override readonly name: "InvalidSettingsError";

  constructor(message: string) {
    super(message);
    this.name = "InvalidSettingsError";
  }
}

export type ErrorFix = "open_preferences" | "retry" | "none";

export interface ErrorDescription {
  readonly title: string;
  readonly message: string;
  readonly fix: ErrorFix;
}

const SETUP_REASONS: ReadonlySet<ProviderErrorReason> = new Set([
  "unauthorized",
  "model_unavailable",
  "request_rejected",
]);

export function describeError(error: unknown): ErrorDescription {
  if (error instanceof InvalidSettingsError) {
    return { title: "Check provider settings", message: error.message, fix: "open_preferences" };
  }
  if (error instanceof NoProviderConfiguredError) {
    return { title: "No provider configured", message: error.message, fix: "open_preferences" };
  }
  if (error instanceof EmptyTextError) {
    return { title: "Nothing to translate", message: error.message, fix: "none" };
  }
  if (error instanceof AllProvidersFailedError) {
    return { title: "All providers failed", message: error.message, fix: fixFor(error.failures) };
  }
  if (error instanceof ProviderError) {
    return { title: "Translation failed", message: error.summary, fix: fixFor([error]) };
  }
  if (error instanceof Error) {
    return { title: "Translation failed", message: error.message, fix: "retry" };
  }
  return { title: "Translation failed", message: String(error), fix: "retry" };
}

function fixFor(failures: readonly ProviderError[]): ErrorFix {
  return failures.every((failure) => SETUP_REASONS.has(failure.reason))
    ? "open_preferences"
    : "retry";
}
