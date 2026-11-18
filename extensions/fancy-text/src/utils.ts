export function applyTextDecoration(text: string, decorationText: string): string {
  if (!decorationText || decorationText.trim() === "") {
    return text;
  }
  return `${decorationText} ${text} ${decorationText}`;
}
