import { closeMainWindow } from "@raycast/api";
import { runJSInYandexMusicTab } from "./utils";

export default async () => {
  if (
    await runJSInYandexMusicTab(
      `[...document.querySelectorAll('use')].find(u => u.getAttribute('xlink:href')?.includes('dislike'))?.closest('button')?.click()`
    )
  ) {
    await closeMainWindow();
  }
};
