import he from "he";

export function extractDocumentTitle(document: string): string {
  const title = document.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
  return he.decode(title);
}

export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}
