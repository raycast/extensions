export function escapeMarkdown(value: string): string {
  const markdownCharacters = new Set("\\`*_{}[]()#+.!<>|~-".split(""));
  return [...value].map((character) => (markdownCharacters.has(character) ? `\\${character}` : character)).join("");
}
