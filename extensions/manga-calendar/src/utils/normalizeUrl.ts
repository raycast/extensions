export function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeURL(text: string, replacement: string): string {
  return removeDiacritics(text.replaceAll(" ", replacement));
}
