export function formatUrl(url: string) {
  return url.replace("http://", "https://").replace(/^\/\//, "https://");
}
