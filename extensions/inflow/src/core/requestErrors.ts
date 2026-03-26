export function createAbortError(): Error {
  const error = new Error("AbortError");
  error.name = "AbortError";
  return error;
}

export function isAbortLikeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message === "AbortError" ||
      error.message.includes("Request has been aborted"))
  );
}

export function isRaycastConnectionError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("failed connecting to server");
}
