import { Clipboard, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { copyConcealed, createSecret, formatDuration, getDefaults } from "./shared";

/**
 * Turns the text selected in the frontmost app (or, failing that, the current
 * clipboard content) into an encrypted link using the default settings, and
 * puts the link on the clipboard. No UI: select, hotkey, paste.
 */
async function readSource(): Promise<{ text: string; from: "selection" | "clipboard" } | null> {
  try {
    const selected = await getSelectedText();
    if (selected.trim()) return { text: selected, from: "selection" };
  } catch {
    // No selection available in the frontmost app; fall through to the clipboard.
  }
  const clipboard = await Clipboard.readText();
  if (clipboard?.trim()) return { text: clipboard, from: "clipboard" };
  return null;
}

export default async function main() {
  const source = await readSource();
  if (!source) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to share",
      message: "Select some text or copy it to the clipboard first.",
    });
    return;
  }

  const { durationSeconds, selfDestruct } = getDefaults();

  try {
    await showToast({ style: Toast.Style.Animated, title: `Encrypting ${source.from}...` });
    const expirationTimestamp = Math.floor(Date.now() / 1000) + durationSeconds;
    const shareUrl = await createSecret(source.text, expirationTimestamp, selfDestruct);
    await copyConcealed(shareUrl);

    const destructNote = selfDestruct ? "Self-destructs after first view." : "Can be viewed multiple times.";
    await showHUD(`Link copied! Expires in ${formatDuration(durationSeconds)}. ${destructNote}`);
  } catch (error) {
    console.error("Failed to create secret:", error);
    const message = error instanceof Error ? error.message : "Please try again.";
    await showToast({ style: Toast.Style.Failure, title: "Failed to create secret", message });
  }
}
