/**
 * Typed errors and user-facing message helpers for Tesla Clips operations.
 */

/** Base error for Tesla Clips with a stable code and user-facing message. */
export abstract class TeslaClipError extends Error {
  /** Machine-readable error identifier. */
  abstract readonly code: string;
  /** Message safe to show in Raycast UI. */
  abstract readonly userMessage: string;
  /** Optional structured context for logging or dynamic messages. */
  readonly context: Record<string, unknown> | undefined;

  /**
   * @param message - Internal error description.
   * @param context - Optional key/value context attached to the error.
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context ?? undefined;
  }
}

/** Thrown when ffmpeg cannot be resolved from preferences or common install paths. */
export class FfmpegNotFoundError extends TeslaClipError {
  readonly code = "FFMPEG_NOT_FOUND";
  readonly userMessage =
    "Unable to locate ffmpeg. Install ffmpeg or set a full path in preferences (for example /opt/homebrew/bin/ffmpeg).";
}

/** Thrown when one or more configured source roots do not exist. */
export class SourceNotFoundError extends TeslaClipError {
  readonly code = "SOURCE_NOT_FOUND";
  get userMessage(): string {
    const paths = this.context?.["paths"];
    return `Source folder not found: ${Array.isArray(paths) ? paths.join(", ") : "unknown"}`;
  }
}

/** Thrown when the configured output root directory does not exist. */
export class OutputRootNotFoundError extends TeslaClipError {
  readonly code = "OUTPUT_ROOT_NOT_FOUND";
  get userMessage(): string {
    const outputPath = this.context?.["outputPath"];
    return `Output root folder does not exist: ${typeof outputPath === "string" ? outputPath : "unknown"}`;
  }
}

/** Thrown when a merged output file fails post-merge size validation. */
export class OutputValidationError extends TeslaClipError {
  readonly code = "OUTPUT_VALIDATION_FAILED";
  get userMessage(): string {
    return `Output validation failed: ${this.message}`;
  }
}

/**
 * Type guard for {@link TeslaClipError}.
 *
 * @param error - Unknown thrown or caught value.
 * @returns `true` when `error` is a {@link TeslaClipError} instance.
 */
export function isTeslaClipError(error: unknown): error is TeslaClipError {
  return error instanceof TeslaClipError;
}

/**
 * Resolves a short message suitable for UI toasts and alerts.
 *
 * @param error - Unknown thrown or caught value.
 * @returns {@link TeslaClipError.userMessage}, `Error.message`, or `String(error)`.
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (isTeslaClipError(error)) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
