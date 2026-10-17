import { Clipboard, LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

import { withClipboardLock } from "./clipboard-lock";
import { getErrorMessage, showCopyFeedback, showFailureToast } from "./feedback";

const clipboardClearDelayMs = 60_000;
const latestClipboardCopyKey = "latestClipboardCopy";

export async function copyGeneratedSecret(
  text: string,
  label: "Password" | "Passphrase",
  preferences: Preferences,
): Promise<void> {
  let clipboardCleanup: Promise<void> | undefined;
  let action = "Copy";
  try {
    try {
      await withClipboardLock(async () => {
        const copyToken = await trackAndCopySecretText(text);
        clipboardCleanup = clearSecretTextAfterDelay(text, preferences.clearClipboardAfterDelay, copyToken);

        if (preferences.pasteAfterGenerating) {
          action = "Paste";
          await Clipboard.paste(text);
        }
      });
    } catch (error) {
      await showFailureToast(`Could Not ${action} ${label}`, getErrorMessage(error));
      return;
    }

    await showCopyFeedback(
      preferences.pasteAfterGenerating ? `${label} copied and pasted` : `${label} copied to clipboard`,
      preferences.showCopyHud,
    );
  } finally {
    await clipboardCleanup;
  }
}

export async function copySecretText(text: string): Promise<string> {
  return withClipboardLock(() => trackAndCopySecretText(text));
}

async function trackAndCopySecretText(text: string): Promise<string> {
  const previousCopyToken = await LocalStorage.getItem<string>(latestClipboardCopyKey);
  const copyToken = randomUUID();
  // Tracking must succeed before changing the clipboard. The lock excludes other commands and cleanup tasks.
  await LocalStorage.setItem(latestClipboardCopyKey, copyToken);
  try {
    await Clipboard.copy(text, { concealed: true });
  } catch (error) {
    try {
      if (previousCopyToken === undefined) {
        await LocalStorage.removeItem(latestClipboardCopyKey);
      } else {
        await LocalStorage.setItem(latestClipboardCopyKey, previousCopyToken);
      }
    } catch {
      throw new Error(
        "Copy failed and previous clipboard cleanup could not be restored. Clear the clipboard manually.",
      );
    }
    throw error;
  }
  return copyToken;
}

export async function clearSecretTextAfterDelay(
  text: string,
  clearAfterDelay: boolean,
  copyToken: string,
): Promise<void> {
  if (!clearAfterDelay) {
    return;
  }

  await wait(clipboardClearDelayMs);
  await clearClipboardIfUnchanged(text, copyToken);
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function clearClipboardIfUnchanged(text: string, copyToken: string): Promise<void> {
  try {
    await withClipboardLock(async () => {
      if ((await LocalStorage.getItem<string>(latestClipboardCopyKey)) !== copyToken) {
        return;
      }
      const clipboardText = await Clipboard.readText();

      if (clipboardText === text) {
        await Clipboard.clear();
      }
    });
  } catch {
    // Clipboard cleanup is best-effort and must not surface secrets.
  }
}
