export type JsonValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      error: string;
    };

export function validateJson(input: string): JsonValidationResult {
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

export function formatJson(input: string): string {
  return JSON.stringify(JSON.parse(input), null, 2);
}
