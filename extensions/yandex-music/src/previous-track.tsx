import { closeMainWindow } from "@raycast/api";
import { runJSInYandexMusicTab } from "./utils";

export default async () => {
  if (await runJSInYandexMusicTab(`document.querySelector('button[aria-label*=Previous]').click()`)) {
    await closeMainWindow();
  }
};
