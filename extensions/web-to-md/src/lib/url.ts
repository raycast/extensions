export function looksLikeUrl(input: string): boolean {
  if (!input) return false;
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Please enter a URL.");

  // Convenience: allow "example.com" without scheme, but reject non-http(s) schemes explicitly.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;

  const u = new URL(withScheme);
  if (u.protocol !== "http:" && u.protocol !== "https:")
    throw new Error("URL must start with http:// or https://");
  return u.toString();
}
