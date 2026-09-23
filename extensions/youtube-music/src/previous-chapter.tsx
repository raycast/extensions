import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export const goToPreviousChapter = `(function() {
    const activeChapter = document.querySelector('ytd-macro-markers-list-item-renderer[active]');
    if (!activeChapter) {
      return "no-active-chapter";
    }
    const previousChapter = activeChapter?.previousElementSibling;
    if (!previousChapter) {
      return "no-previous-chapter";
    }
    previousChapter?.querySelector('a')?.click();
    return "previous-chapter-clicked";
  })();`;

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(goToPreviousChapter);
    if (result === undefined) {
      await closeMainWindow();
      return;
    }
    switch (result) {
      case "no-active-chapter":
        await showHUD("❌ No active chapter");
        break;
      case "no-previous-chapter":
        await showHUD("❌ No previous chapter");
        break;
      case "previous-chapter-clicked":
        await showHUD("⏮️ Previous chapter");
        break;
      default:
        await showHUD(`❌ Unknown Error: ${result}`);
    }
    await closeMainWindow();
  } catch (error) {
    await showHUD(`❌ Command failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
