export function getTagQueryPrefix(tagName: string): string {
  const normalizedName = tagName.trim();

  if (/^[A-Za-z0-9_-]+$/.test(normalizedName)) {
    return `tag:${normalizedName}`;
  }

  return `tag:"${normalizedName.replace(/"/g, '\\"')}"`;
}
