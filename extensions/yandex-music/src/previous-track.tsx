import { closeMainWindow } from "@raycast/api";
import { runJSInYandexMusicTab } from "./utils";

export default async () => {
  if (await runJSInYandexMusicTab("document.querySelector('.player-controls__btn_prev').click();")) {
    await closeMainWindow();
  }
};
