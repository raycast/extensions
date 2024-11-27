export function escapeChar(char: string) {
  return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
}
