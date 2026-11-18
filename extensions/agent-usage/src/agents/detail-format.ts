export function generateAsciiBar(percent: number, width = 12): string {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

export function formatErrorMarkdown(message: string): string {
  return `### Message\n\n${message}`;
}
