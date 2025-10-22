export function getSubtitle(url: string) {
  try {
    const { hostname } = new URL(url);
    // Remove leading 'www.' from hostname if present
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
