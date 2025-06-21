import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async (closeWindow = true) => {
  if (await runJSInYouTubeMusicTab('document.querySelector(".volume button")?.click()')) {
    if (closeWindow) {
      return await closeMainWindow();
    }
  }
};
