import { AuthError } from "./auth";

/** Runs tasks concurrently and separates fulfilled values from failures, so one failing course does not hide the others. */
export async function collectSettled<T>(tasks: Promise<T>[]): Promise<{ values: T[]; errors: unknown[] }> {
  const results = await Promise.allSettled(tasks);
  const values: T[] = [];
  const errors: unknown[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") values.push(result.value);
    else errors.push(result.reason);
  }
  return { values, errors };
}

/**
 * Rethrows an `AuthError` whenever one occurred (the login-required empty state must win over partial data)
 * and rethrows when nothing succeeded; otherwise reports partial failures through the callback.
 */
export function reportPartialFailures(
  errors: unknown[],
  successes: number,
  onPartialFailure?: (errors: unknown[]) => void,
): void {
  if (errors.length === 0) return;
  const authError = errors.find((error) => error instanceof AuthError);
  if (authError) throw authError;
  if (successes === 0) throw errors[0];
  onPartialFailure?.(errors);
}
