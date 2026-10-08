const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** `fm` writes colored text even when its output is piped, and NO_COLOR is ignored. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

export type FmErrorKind =
  | "not-installed"
  | "license"
  | "model-unavailable"
  | "guardrails"
  | "context-overflow"
  | "too-long"
  | "unsupported-language"
  | "timeout"
  | "cancelled"
  | "unknown";

export class FmError extends Error {
  constructor(
    readonly kind: FmErrorKind,
    message: string,
    readonly detail = "",
  ) {
    super(message);
    this.name = "FmError";
  }
}

/** Exit code that `fm` uses when the license has not been accepted yet. */
export const LICENSE_EXIT_CODE = 69;

/** Turns the stderr text and exit code of a failed `fm` run into an error with a clear message. */
export function toFmError(stderr: string, exitCode: number | null): FmError {
  const detail = stripAnsi(stderr)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("Transcript saved to:"))
    .join("\n")
    .replace(/^Error:\s*/, "");

  const licenseError = new FmError(
    "license",
    "The fm license has not been accepted yet. Run `sudo fm license` in Terminal once, then try again.",
    detail,
  );
  if (/license/i.test(detail)) return licenseError;
  if (/guardrail/i.test(detail)) {
    return new FmError(
      "guardrails",
      "The model's safety guardrails stopped this request. Try different wording or a different text.",
      detail,
    );
  }
  if (/context size|context window|exceeded the model/i.test(detail)) {
    return new FmError(
      "context-overflow",
      "This is too long for the model's context window. Use a shorter text or start a new chat.",
      detail,
    );
  }
  if (/unsupported language|language.{0,40}not supported/i.test(detail)) {
    return new FmError("unsupported-language", "The model does not support this language yet.", detail);
  }
  if (/unavailable|not available|not ready|apple intelligence|downloading/i.test(detail)) {
    return new FmError(
      "model-unavailable",
      "The on-device model is not available. Turn on Apple Intelligence and wait until the model has downloaded.",
      detail,
    );
  }
  // 69 is also the generic "service unavailable" exit code, so it only decides when the text did not.
  if (exitCode === LICENSE_EXIT_CODE) return licenseError;
  return new FmError("unknown", detail || `fm exited with code ${exitCode ?? "unknown"}.`, detail);
}

/** Markdown shown in place of an answer when a request fails. */
export function errorMarkdown(error: FmError): string {
  const lines = [`## Something went wrong`, "", error.message];
  if (error.detail && error.detail !== error.message) {
    lines.push("", "```", error.detail, "```");
  }
  if (["not-installed", "license", "model-unavailable"].includes(error.kind)) {
    lines.push("", "Open **Check Setup** to see what is missing and how to fix it.");
  }
  return lines.join("\n");
}
