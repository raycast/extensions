export function isNumeric(value: string): boolean {
  return /^-?\d+$/.test(value);
}
