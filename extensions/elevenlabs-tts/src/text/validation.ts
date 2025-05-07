/**
 * Validates that text is selected in the active application
 * Provides user-friendly error messages for common issues
 *
 * @returns Selected text if available
 * @throws {Error} with guidance if no text is selected
 */
export function validateSelectedText(text: string): string {
  try {
    if (!text?.trim()) {
      throw new Error("No text selected - Select text and try again");
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unable to get selected text")) {
      throw new Error("Select text in any application before running this command");
    }
    throw error;
  }
}
