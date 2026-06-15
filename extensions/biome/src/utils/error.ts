export function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function wrapError(error: unknown, context: string): Error {
  const message = normalizeError(error);
  console.error(`${context}:`, message);
  return new Error(`${context}: ${message}`);
}
