export function isValid(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export function extractURLs(urls: string): string[] {
  return urls
    .split("\n")
    .map((url) => url.trim())
    .filter((url) => url.includes("http") && isValid(url));
}
