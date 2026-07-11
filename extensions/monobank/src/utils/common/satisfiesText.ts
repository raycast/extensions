export function satisfiesTexts(searchText: string, ...texts: string[]): boolean {
  return texts.some((text) => text.toLowerCase().includes(searchText.toLowerCase()));
}
