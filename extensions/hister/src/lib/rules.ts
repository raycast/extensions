// Same patterns newer Hister servers generate in /api/rules/preview, which older servers lack.

function quoteMeta(text: string): string {
  return text.replace(/[\\.+*?()|[\]{}^$]/g, "\\$&");
}

export function pagePattern(url: string): string {
  return `^${quoteMeta(url)}$`;
}

export function sitePattern(url: string, { subdomains = false } = {}): string {
  const host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  const hostPattern = `${subdomains ? "(?:[^./:?#@]+\\.)*" : ""}${quoteMeta(host)}\\.?`;
  return `(?i)^https?://(?:[^/?#@]*@)?${hostPattern}(?::[0-9]+)?(?:[/?#]|$)`;
}
