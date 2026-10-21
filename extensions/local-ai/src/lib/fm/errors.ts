import { LICENSE_EXIT_CODE } from "./constants";

export type FmErrorKind =
  | "notInstalled"
  | "license"
  | "unavailable"
  | "contextOverflow"
  | "invalidModel"
  | "guardrail"
  | "timeout"
  | "aborted"
  | "unknown";

export class FmError extends Error {
  readonly kind: FmErrorKind;
  readonly detail?: string;

  constructor(kind: FmErrorKind, message: string, detail?: string) {
    super(message);
    this.name = "FmError";
    this.kind = kind;
    this.detail = detail;
  }
}

export interface FmFailure {
  exitCode: number | null;
  stderr: string;
  spawnErrorCode?: string;
  timedOut?: boolean;
  aborted?: boolean;
  timeoutMs?: number;
  model?: string;
}

export const NOT_INSTALLED_MESSAGE = "Requires macOS 27 with Apple Intelligence";
export const LICENSE_MESSAGE = "Open Terminal and run `fm license`. If that fails, try `sudo fm license`.";
export const UNAVAILABLE_MESSAGE = "Turn on Apple Intelligence in System Settings";
export const GUARDRAIL_MESSAGE = "The on-device model declined this text.";

export const SETUP_ERROR_KINDS: ReadonlySet<FmErrorKind> = new Set<FmErrorKind>([
  "notInstalled",
  "license",
  "unavailable",
]);

const CONTEXT_OVERFLOW_PATTERN = /exceeded the model's context size/i;
const INVALID_MODEL_PATTERN = /is invalid for '-m <model>'/i;
const GUARDRAIL_PATTERN = /guardrail|unsafe|sensitive content/i;
const UNAVAILABLE_PATTERN = /apple intelligence|not available|unavailable|not enabled|not ready/i;

export function tooLongMessage(tokens?: number, limit?: number): string {
  const base = "Text is too long for the on-device model";
  return tokens === undefined || limit === undefined ? base : `${base} (${tokens} tokens, limit ${limit})`;
}

export function mapFmFailure(failure: FmFailure): FmError {
  const stderr = failure.stderr.trim();

  if (failure.aborted) return new FmError("aborted", "Cancelled");
  if (failure.timedOut) {
    const seconds = Math.round((failure.timeoutMs ?? 0) / 1000);
    return new FmError(
      "timeout",
      `The on-device model did not finish within ${seconds} seconds. Try shorter text or raise the timeout in preferences.`,
      stderr || undefined,
    );
  }
  if (failure.spawnErrorCode === "ENOENT")
    return new FmError("notInstalled", NOT_INSTALLED_MESSAGE, stderr || undefined);
  if (failure.exitCode === LICENSE_EXIT_CODE) return new FmError("license", LICENSE_MESSAGE, stderr || undefined);
  if (CONTEXT_OVERFLOW_PATTERN.test(stderr)) return new FmError("contextOverflow", tooLongMessage(), stderr);
  if (INVALID_MODEL_PATTERN.test(stderr)) {
    return new FmError(
      "invalidModel",
      `Model "${failure.model ?? "unknown"}" is not available on this Mac. Edit the command and pick another model.`,
      stderr,
    );
  }
  if (GUARDRAIL_PATTERN.test(stderr)) return new FmError("guardrail", GUARDRAIL_MESSAGE, stderr);
  if (UNAVAILABLE_PATTERN.test(stderr)) return new FmError("unavailable", UNAVAILABLE_MESSAGE, stderr);

  const firstLine = stderr
    .split("\n")[0]
    .replace(/^Error:\s*/i, "")
    .trim();
  return new FmError("unknown", firstLine || `fm exited with code ${failure.exitCode}`, stderr || undefined);
}
