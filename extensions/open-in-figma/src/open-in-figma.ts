import { showHUD, open, captureException, Clipboard } from "@raycast/api";
import { URL } from "url";

const APP = "Figma";

const MESSAGES = {
  OPENING_IN_FIGMA: `✅ Opening in Figma`,
  INVALID_FIGMA_URL: `⚠️ Not a valid Figma URL.`,
  EMPTY_CLIPBOARD: `⚠️ The clipboard does not contain any text.`,
  UNABLE_TO_OPEN: (clipboardText: string) => `❌ Could not open ${clipboardText} in ${APP}.`,
};

export default async function main() {
  const clipboardText = (await Clipboard.readText())?.trim();

  if (clipboardText) {
    try {
      const url = new URL(clipboardText);

      try {
        if (url.hostname.includes("figma.com")) {
          await open(url.toString(), APP);
          await showHUD(MESSAGES.OPENING_IN_FIGMA);
        } else {
          await showHUD(MESSAGES.INVALID_FIGMA_URL);
        }
      } catch (e: unknown) {
        captureException(e);
        await showHUD(MESSAGES.UNABLE_TO_OPEN(clipboardText));
      }
    } catch {
      await showHUD(MESSAGES.INVALID_FIGMA_URL);
    }
  } else {
    await showHUD(MESSAGES.EMPTY_CLIPBOARD);
  }
}
