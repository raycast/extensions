export function isValidJson(input: string): boolean {
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}

export function transformJson(input: string, pretty = false): string {
  return JSON.stringify(JSON.parse(input), null, pretty ? 2 : undefined);
}
