export function parseStringList(value: string): string[] {
  const trimmed = value.trim();

  if (trimmed.startsWith("[")) {
    const parsed: unknown = JSON.parse(trimmed);

    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      throw new Error("Expected a JSON array of strings");
    }

    return parsed;
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseOptionalStringList(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return parseStringList(value);
}
