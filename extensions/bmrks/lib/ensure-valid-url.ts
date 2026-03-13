export function ensureValidUrl(url: string): string {
  if (!/^(?:f|ht)tps?:\/\//.test(url)) {
    return "http://" + url;
  }
  return url;
}
