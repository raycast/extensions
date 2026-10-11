import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import type { RecentEmojiStorage } from "./recent-storage";

export async function performEmojiAction(
  emoji: string,
  action: "copy" | "paste",
  history: Pick<RecentEmojiStorage, "record">,
  onRecorded: (ids: string[]) => void,
  content = emoji,
): Promise<void> {
  try {
    await Clipboard[action](content);
  } catch {
    await showHUD("Could not " + action + " emoji");
    return;
  }
  try {
    // Keep the action pending until persistence finishes, before dismissal.
    onRecorded(await history.record(emoji));
  } catch {
    await showHUD("Emoji " + (action === "copy" ? "copied" : "pasted") + ", but recent history could not be saved");
    return;
  }
  await closeMainWindow();
}
