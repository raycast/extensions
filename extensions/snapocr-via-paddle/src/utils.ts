import { unlink } from "node:fs/promises";

export async function cleanupScreenshot(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Silently ignore cleanup failures
  }
}

export function postProcessText(text: string): string {
  return text
    .replace(/\u3000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
