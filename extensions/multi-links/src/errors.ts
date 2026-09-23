export function friendly(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
