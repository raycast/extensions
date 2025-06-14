export function ensureValidUrl(url: string): string {
  if (!/^(?:f|ht)tps?:\/\//.test(url)) {
    return "https://" + url;
  }
  return url;
}
