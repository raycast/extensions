export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}
