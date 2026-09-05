export type GroundcrewClientErrorCode =
  | "INVALID_EXECUTABLE_PREFERENCE"
  | "EXECUTABLE_NOT_FOUND"
  | "EXECUTABLE_NOT_EXECUTABLE"
  | "LAUNCH_FAILED"
  | "COMMAND_FAILED"
  | "COMMAND_TIMEOUT"
  | "COMMAND_CANCELED"
  | "MALFORMED_VERSION"
  | "INCOMPATIBLE_VERSION"
  | "MALFORMED_JSON"
  | "INVALID_JSON_SHAPE"
  | "STATUS_SCHEMA_MISMATCH"
  | "INVALID_ARGUMENT";

export interface GroundcrewErrorDiagnostics {
  exitCode?: number | null;
  stderr?: string;
  stdout?: string;
}

export class GroundcrewClientError extends Error {
  public readonly code: GroundcrewClientErrorCode;
  public readonly diagnostics: GroundcrewErrorDiagnostics | undefined;

  public constructor(
    code: GroundcrewClientErrorCode,
    message: string,
    options: { cause?: unknown; diagnostics?: GroundcrewErrorDiagnostics } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "GroundcrewClientError";
    this.code = code;
    this.diagnostics = options.diagnostics;
  }
}
