import { clearIfStillSecret } from "./lib/clipboard";

/**
 * Background command (every minute): clears the clipboard if it still holds a
 * secret copied at least 30 seconds ago. See lib/clipboard.ts.
 */
export default async function ClearClipboardCommand() {
  await clearIfStillSecret();
}
