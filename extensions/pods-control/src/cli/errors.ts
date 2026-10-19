import type { CliPayload } from "./types";

export type CliErrorCode =
  | "not-installed"
  | "no-device"
  | "bad-args"
  | "no-op"
  | "unsupported"
  | "read-error"
  | "unavailable"
  | "state-uncertain"
  | "ambiguous-device"
  | "invalid-response"
  | "unknown";

const CLI_ERROR_CODES = [
  "no-device",
  "bad-args",
  "no-op",
  "unsupported",
  "read-error",
  "unavailable",
  "state-uncertain",
  "ambiguous-device",
] as const;

export const ERROR_MESSAGES: Record<CliErrorCode, string> = {
  "not-installed": "The pods-control CLI is not installed.",
  "no-device": "Connect your AirPods or Beats to your Mac and try again.",
  "bad-args": "The pods-control CLI rejected the command arguments.",
  "no-op": "macOS did not confirm the change.",
  unsupported: "This feature is not supported by the connected device.",
  "read-error": "The CLI could not read status. Check that your AirPods or Beats are connected and try again.",
  unavailable: "This feature is unavailable on your AirPods or Beats right now.",
  "state-uncertain": "The CLI could not confirm the final listening state.",
  "ambiguous-device": "Multiple compatible devices are connected. Disconnect all but one and try again.",
  "invalid-response": "The pods-control CLI returned an invalid response.",
  unknown: "The pods-control CLI failed unexpectedly.",
};

export type CliProcessFailureKind = "timeout" | "max-buffer" | "killed" | "process";

/**
 * Bounded information about a child-process failure. The command and its
 * environment are intentionally omitted; stderr is the only helper output
 * retained, and it is capped before it reaches a toast or copied error.
 */
export interface CliDiagnostics {
  kind: CliProcessFailureKind;
  stderr: string;
  exitCode: number | string | null;
  signal: string | number | null;
}

export class CliError extends Error {
  readonly code: CliErrorCode;
  readonly payload: CliPayload | null;
  readonly diagnostics: CliDiagnostics | null;

  constructor(
    code: CliErrorCode,
    payload: CliPayload | null = null,
    messageOverride?: string,
    diagnostics: CliDiagnostics | null = null,
  ) {
    super(messageOverride ?? ERROR_MESSAGES[code]);
    this.name = "CliError";
    this.code = code;
    this.payload = payload;
    this.diagnostics = diagnostics;
  }
}

/** Map the JSON `error` token to a CliErrorCode; the exit status is ignored because the CLI may renumber it. Unrecognized tokens are `unknown`. */
export function toErrorCode(payloadError: string | undefined): CliErrorCode {
  if (payloadError && (CLI_ERROR_CODES as readonly string[]).includes(payloadError)) {
    return payloadError as CliErrorCode;
  }
  return "unknown";
}
