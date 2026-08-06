/** The message from an unknown thrown value, or null if there was none. */
export function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  return error instanceof Error ? error.message : String(error);
}
