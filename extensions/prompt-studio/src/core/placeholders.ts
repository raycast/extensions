const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9 _-]*?)\s*\}\}/g;

export function extractPlaceholders(body: string): string[] {
  const names: string[] = [];
  for (const match of body.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1]?.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

export function fillPlaceholders(
  body: string,
  values: Readonly<Record<string, string>>,
): string {
  return body.replace(PLACEHOLDER_PATTERN, (token, rawName: string) => {
    const value = values[rawName.trim()];
    return value !== undefined && value.trim() !== "" ? value : token;
  });
}
