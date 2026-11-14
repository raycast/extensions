export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]<>()|])/g, "\\$1").replace(/[\r\n]+/g, " ");
}
