const remSize = 16;

export function roundNumber(value: number) {
  return parseFloat(value.toFixed(4));
}

export function convertToRem(value: string, unit: TUnit): number {
  if (unit === "rem") {
    return parseFloat(value);
  }

  return parseFloat(value) / remSize;
}

export function convertValue(value: string, unit: TUnit): number {
  if (unit === "rem") {
    return parseFloat(value) / remSize;
  }

  return parseFloat(value) * remSize;
}
