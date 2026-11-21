import { AllProvidersFailedError, ProviderError } from "./errors";
import type { ProviderConfig } from "./providers";
import type { ToneId } from "./tones";

export interface DiagnosticContext {
  readonly command: string;
  readonly tone: ToneId;
  readonly targetLanguage: string;
  readonly textLength: number;
  readonly providers: readonly ProviderConfig[];
}

export function buildDebugReport(error: unknown, context: DiagnosticContext, now = new Date()): string {
  const report = {
    timestamp: now.toISOString(),
    command: context.command,
    tone: context.tone,
    targetLanguage: context.targetLanguage,
    textLength: context.textLength,
    providers: context.providers.map(({ id, model, baseUrl, apiKey }) => ({
      id,
      model,
      baseUrl,
      hasApiKey: apiKey !== undefined,
    })),
    error: serializeError(error),
  };
  return JSON.stringify(
    report,
    (_key, value: unknown) => (typeof value === "string" ? redactSensitiveText(value, context.providers) : value),
    2,
  );
}

export function redactSensitiveText(text: string, providers: readonly ProviderConfig[]): string {
  const withoutUrlCredentials = text.replace(/https?:\/\/[^\s"'<>]+/gi, (value) => {
    if (!URL.canParse(value)) {
      return "[REDACTED URL]";
    }
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  });
  const keys = providers
    .flatMap(({ apiKey }) => (apiKey ? [apiKey, encodeURIComponent(apiKey)] : []))
    .toSorted((left, right) => right.length - left.length);
  return keys.reduce((redacted, key) => redacted.replaceAll(key, "[REDACTED]"), withoutUrlCredentials);
}

export function redactErrorCause(error: unknown, providers: readonly ProviderConfig[]): Error {
  return new Error(redactSensitiveText(error instanceof Error ? error.message : String(error), providers));
}

function serializeError(error: unknown): unknown {
  if (error instanceof AllProvidersFailedError) {
    return {
      name: error.name,
      message: error.message,
      failures: error.failures.map(serializeError),
    };
  }
  if (error instanceof ProviderError) {
    return {
      name: error.name,
      provider: error.provider,
      reason: error.reason,
      status: error.status,
      requestId: error.requestId,
      message: error.message,
      cause: error.cause instanceof Error ? error.cause.message : undefined,
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { value: String(error) };
}
