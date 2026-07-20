export function getTrailingNumberFromUrl(url: string): string | undefined {
  const m = url.match(/(\d+)(?:\/?$)/);
  return m?.[1];
}

export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase());
}
