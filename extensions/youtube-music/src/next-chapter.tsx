import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export const goToNextChapter = `(function() {
    const activeChapter = document.querySelector('ytd-macro-markers-list-item-renderer[active]');
    if (!activeChapter) {
      return "no-active-chapter";
    }
    const nextChapter = activeChapter?.nextElementSibling;
    if (!nextChapter) {
      return "no-next-chapter";
    }
    nextChapter.querySelector('a')?.click();
    return "next-chapter-clicked";
  })();`;

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(goToNextChapter);
    switch (result) {
      case "no-active-chapter":
        await showHUD("❌ No active chapter");
        break;
      case "no-next-chapter":
        await showHUD("❌ No next chapter");
        break;
      case "next-chapter-clicked":
        await showHUD("⏭️ Next chapter");
        break;
      default:
        await showHUD(`❌ Unknown Error: ${result}`);
    }
    await closeMainWindow();
  } catch (error) {
    // do nothing if error is thrown because it will be handled by the toast
  }
};
