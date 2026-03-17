export function looksLikeJson(value: string): boolean {
  const trimmedValue = value.trim();

  return (
    (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
    (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))
  );
}
