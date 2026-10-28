/** Blob and SQLite results arrive inside prose and an untrusted-output tag, not as bare JSON. */
export function unwrapUntrusted(text: string): string {
  const match = text.match(/<untrusted-output\b[^\n]*? id="([^"]+)">\r?\n([\s\S]*?)\r?\n<\/untrusted-output id="\1">/);
  return match ? match[2] : text;
}
