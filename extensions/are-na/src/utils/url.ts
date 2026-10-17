/** True only for absolute http(s) URLs (rejects functions, objects, relative paths, garbage). */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const t = value.trim();
  if (!t.startsWith("http://") && !t.startsWith("https://")) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
