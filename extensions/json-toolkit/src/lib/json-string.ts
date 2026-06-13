import { assertInputWithinLimit } from "./input";

export class InvalidJsonStringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidJsonStringError";
  }
}

export function escapeJsonString(input: string): string {
  assertInputWithinLimit(input);
  return JSON.stringify(input);
}

export function unescapeJsonString(input: string): string {
  assertInputWithinLimit(input);

  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    throw new InvalidJsonStringError(
      "Input must be a valid JSON string literal.",
    );
  }

  if (typeof value !== "string") {
    throw new InvalidJsonStringError("Input must decode to a JSON string.");
  }

  return value;
}
