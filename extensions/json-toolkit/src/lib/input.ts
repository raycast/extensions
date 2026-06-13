export const MAX_INPUT_BYTES = 5 * 1024 * 1024;

export class InputTooLargeError extends Error {
  readonly actualBytes: number;

  constructor(actualBytes: number) {
    super("Input is larger than the 5 MB limit.");
    this.name = "InputTooLargeError";
    this.actualBytes = actualBytes;
  }
}

export function getUtf8ByteLength(input: string): number {
  return new TextEncoder().encode(input).byteLength;
}

export function assertInputWithinLimit(input: string): void {
  const actualBytes = getUtf8ByteLength(input);

  if (actualBytes > MAX_INPUT_BYTES) {
    throw new InputTooLargeError(actualBytes);
  }
}

export function requireNonEmptyText(
  input: string | null | undefined,
  sourceName: string,
): string {
  if (!input || input.trim().length === 0) {
    throw new Error(`${sourceName} does not contain text.`);
  }

  return input;
}
