export function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}
