export function removeNonAlphaNumeric(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, "");
}
