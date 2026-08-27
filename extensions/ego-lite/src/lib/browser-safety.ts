export function normalizeWebUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP or HTTPS URLs can be opened in Ego Lite.");
  }
  return url.toString();
}
