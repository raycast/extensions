export function normalizeExternalUrl(raw?: string | null) {
  const trimmed = raw?.trim();
  if (!trimmed) return;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
