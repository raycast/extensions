/**
 * Type guard utility functions
 */

export function isString(x: unknown): x is string {
  return typeof x === "string";
}

export function isNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export function toStringOrUndefined(x: unknown): string | undefined {
  return isString(x) ? x : undefined;
}
