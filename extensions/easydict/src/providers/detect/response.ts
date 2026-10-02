import { isRecord } from "@/shared/validation";

/** Decode only the fields consumed by detection protocols. BaseDetectProvider normalizes failures. */
export function detectionObject(
  value: unknown,
  message = "Invalid language detection response: expected an object.",
): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(message);
  return value;
}

export function detectionString(
  value: unknown,
  message = "Invalid language detection response: expected a string.",
): string {
  if (typeof value !== "string") throw new Error(message);
  return value;
}

export function detectionNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("Invalid language detection response: expected a finite number.");
  return value;
}
