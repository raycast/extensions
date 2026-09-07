export function buildSelectedTextPrompt(text: string, prefix?: string): string {
  const selectedText = text.trim();
  if (!selectedText) return "";
  const instruction = prefix?.trim();
  return instruction ? `${instruction}\n\n${selectedText}` : selectedText;
}
