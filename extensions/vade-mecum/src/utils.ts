export function escapeRegex(text: string) {
  return text.replace(/[*+?()[\]\\]/g, "\\$&");
}

export function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
