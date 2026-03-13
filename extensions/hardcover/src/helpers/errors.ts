export const UNKNOWN_ERROR_MESSAGE = "Unknown error has occurred. Please report this issue to the developer.";

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
}
