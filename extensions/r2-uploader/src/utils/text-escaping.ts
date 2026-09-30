// Escapes text used as Markdown image alt text, where an unescaped "]" would end the alt segment early.
export function escapeMarkdownAlt(text: string): string {
  return text.replace(/[[\]\\]/g, (char) => `\\${char}`);
}

// Escapes text used inside a double-quoted HTML attribute.
export function escapeHtmlAttribute(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
