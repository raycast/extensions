import { closeMainWindow } from "@raycast/api";
import { runJSInYandexMusicTab } from "./utils";

export default async () => {
  await closeMainWindow();
  await runJSInYandexMusicTab("document.querySelector('.player-controls__btn_next').click();");
};
