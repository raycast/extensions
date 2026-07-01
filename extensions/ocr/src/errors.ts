import type { OcrError, OcrErrorKind } from "./types";

export class OcrDomainError extends Error {
  readonly kind: OcrErrorKind;
  readonly retryable: boolean;

  constructor(kind: OcrErrorKind, message: string, retryable: boolean) {
    super(message);
    this.name = "OcrDomainError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

export function normalizeOcrError(error: unknown): OcrError {
  if (error instanceof OcrDomainError) {
    return {
      kind: error.kind,
      message: error.message,
      retryable: error.retryable,
    };
  }

  if (isAbortError(error)) {
    return {
      kind: "network",
      message: "Reading the screenshot timed out. Check your connection and try again.",
      retryable: true,
    };
  }

  if (error instanceof TypeError) {
    return {
      kind: "network",
      message: "Raycast could not reach OpenRouter. Check your network connection and try again.",
      retryable: true,
    };
  }

  if (error instanceof Error) {
    return {
      kind: "unknown",
      message: error.message || "Something went wrong while reading the screenshot.",
      retryable: true,
    };
  }

  return {
    kind: "unknown",
    message: "Something went wrong while reading the screenshot.",
    retryable: true,
  };
}

export function configurationError(message: string): OcrDomainError {
  return new OcrDomainError("configuration", message, false);
}

export function providerError(message: string): OcrDomainError {
  return new OcrDomainError("provider", message, true);
}

export function emptyTextError(): OcrDomainError {
  return new OcrDomainError("empty", "No readable text was found in the selected area.", true);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
