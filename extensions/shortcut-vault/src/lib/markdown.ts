const markdownControlCharacters = /([\\`*_{}[\]<>#+\-.!|])/g;

export function escapeMarkdown(value: string): string {
  return value.replace(markdownControlCharacters, "\\$1");
}
