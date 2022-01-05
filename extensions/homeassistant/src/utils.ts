export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function ensureMinMax(v1: number, v2: number): [min: number, max: number] {
  if (v1 < v2) {
    return [v1, v2];
  }
  return [v2, v1];
}
