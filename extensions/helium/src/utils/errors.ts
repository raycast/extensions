/**
 * Combine a command's summary with the underlying error text.
 *
 * The no-view commands can only show a HUD, and a fixed string like "Failed
 * opening a new Helium tab" hides the one message that tells the user what to
 * do — "Helium was not found … set its location in the extension preferences".
 * Keeping the summary first means the HUD still reads sensibly when the detail
 * is noise.
 */
export function describeError(summary: string, error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : String(error).trim();
  return detail ? `${summary}: ${detail}` : summary;
}
