export function parsePositiveIntOrUndefined(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  if (!/^\d+$/.test(trimmed)) throw new Error("Enter a positive whole number.");
  const n = Number(trimmed);
  if (n <= 0) throw new Error("Enter a positive whole number.");
  return n;
}
