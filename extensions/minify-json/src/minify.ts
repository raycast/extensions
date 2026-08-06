export function transformJson(input: string, pretty = false): string {
  return JSON.stringify(JSON.parse(input), null, pretty ? 2 : undefined);
}
