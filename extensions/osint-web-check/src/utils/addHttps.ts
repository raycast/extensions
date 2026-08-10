export function addHttps(url: string) {
  if (!/^https?:\/\//.test(url)) {
    return "https://" + url;
  }

  return url;
}
