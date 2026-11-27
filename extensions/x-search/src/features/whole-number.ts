const WHOLE_NUMBER = /^\d+$/;

export function wholeNumberDigits(text: string): string | null {
  if (!WHOLE_NUMBER.test(text)) return null;
  return text.replace(/^0+(?=\d)/, "");
}
