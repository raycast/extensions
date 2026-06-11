export function parseNDJSON<T>(stdout: string, mapper: (item: Record<string, unknown>) => T): T[] {
  if (!stdout || !stdout.trim()) return [];
  try {
    return stdout
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => mapper(JSON.parse(line)));
  } catch {
    return [];
  }
}
