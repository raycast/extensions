export function mapsSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  if (process.platform === "darwin") {
    return `maps://?q=${encoded}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
