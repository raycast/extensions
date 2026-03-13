export function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
