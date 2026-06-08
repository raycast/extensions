export function trimInput(value: string): string {
  return value.trim();
}

const INTEGER_PATTERN = /^[+-]?\d+$/u;

function parseInteger(value: string, fieldName: string): number {
  const trimmed = requireNonEmptyInput(value, fieldName);

  if (!INTEGER_PATTERN.test(trimmed)) {
    throw new Error(`${fieldName} must be a whole number`);
  }

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${fieldName} must be a safe whole number`);
  }

  return parsed;
}

export function splitInputList(value: string): string[] {
  return value
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function requireNonEmptyInput(value: string, fieldName = "input"): string {
  const trimmed = trimInput(value);

  if (trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }

  return trimmed;
}

export function parsePositiveInteger(value: string, fieldName = "value"): number {
  const parsed = parseInteger(value, fieldName);

  if (parsed <= 0) {
    throw new Error(`${fieldName} must be a positive whole number`);
  }

  return parsed;
}

export function parseInclusiveRange(min: string, max: string): { max: number; min: number } {
  const minValue = parseInteger(min, "min");
  const maxValue = parseInteger(max, "max");

  if (maxValue < minValue) {
    throw new Error("max must be greater than or equal to min");
  }

  return { min: minValue, max: maxValue };
}
