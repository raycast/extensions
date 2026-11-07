import type { CliPayload } from "./types";

type CliResource = "listeningMode" | "conversationAwareness";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function resourceForArgs(args: readonly string[]): CliResource | undefined {
  if (args.includes("listening-mode")) return "listeningMode";
  if (args.includes("conversation-awareness")) return "conversationAwareness";
  return undefined;
}

/**
 * Validate the JSON envelope emitted by the helper. JSON.parse intentionally
 * returns unknown here: the CLI is an external process and its output cannot
 * be trusted merely because it is valid JSON.
 *
 * The resource argument makes the command-specific state requirement explicit.
 * A field with JSON null is valid readback; an omitted field is a schema error.
 */
export function validateCliPayload(value: unknown, args: readonly string[] = []): CliPayload | null {
  if (!isRecord(value)) return null;

  const result = value.result;
  if (result !== "ok" && result !== "error" && result !== "no-op" && result !== "interrupted") return null;

  if (hasOwn(value, "supportedListeningModes") && !isStringArray(value.supportedListeningModes)) return null;
  if (hasOwn(value, "listeningMode") && !isNullableString(value.listeningMode)) return null;
  if (hasOwn(value, "conversationAwareness") && !isNullableString(value.conversationAwareness)) return null;
  if (result === "interrupted") {
    if (!hasOwn(value, "signal") || typeof value.signal !== "number" || !Number.isInteger(value.signal)) return null;
    if (value.signal <= 0) return null;
    if (hasOwn(value, "error")) return null;
    if (hasOwn(value, "device") && !isNullableString(value.device)) return null;
    return value as unknown as CliPayload;
  }

  if (!hasOwn(value, "device") || !isNullableString(value.device)) return null;
  if (hasOwn(value, "signal")) return null;

  if (result === "error") {
    if (typeof value.error !== "string" || value.error.length === 0) return null;
  } else if (hasOwn(value, "error")) {
    return null;
  }

  const resource = resourceForArgs(args);
  // Error payloads are useful even when an older helper omits its optional
  // readback field. Successful and no-op resource responses, however, must
  // carry the command-specific field so a schema drift cannot be mistaken for
  // unsupported hardware.
  if (resource && (result === "ok" || result === "no-op") && !hasOwn(value, resource)) return null;
  return value as unknown as CliPayload;
}

/** Parse and validate a helper response. Invalid JSON and invalid envelopes return null. */
export function parseCliPayload(stdout: string, args: readonly string[] = []): CliPayload | null {
  try {
    const parsed: unknown = JSON.parse(stdout);
    return validateCliPayload(parsed, args);
  } catch {
    return null;
  }
}
