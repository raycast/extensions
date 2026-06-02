export function isSingleWord(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return false;
  // one token, letters with optional internal apostrophe/hyphen
  return /^[\p{L}]+(?:[''-][\p{L}]+)*$/u.test(t);
}
