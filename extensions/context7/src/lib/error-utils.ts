export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
