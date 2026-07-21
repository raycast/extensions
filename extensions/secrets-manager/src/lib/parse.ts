export function splitFolder(input: string): string[] {
  return input
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}
