export function pluralize(length: number): string {
  return `item${length > 1 ? "s" : ""}`;
}
