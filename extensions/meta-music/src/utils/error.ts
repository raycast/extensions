/**
 * Parses an error into a string.
 * @param error - The error to parse.
 * @returns The error message.
 */
export function parseError(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An error occurred";
}
