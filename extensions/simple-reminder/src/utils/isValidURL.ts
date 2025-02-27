export function isValidURL(urlString: string): URL | null {
  try {
    const url = new URL(urlString);
    return url;
  } catch (error) {
    return null;
  }
}
