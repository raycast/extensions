import { closeMainWindow } from "@raycast/api";
import { goToChapter, runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  if (await runJSInYouTubeMusicTab(goToChapter.next)) {
    await closeMainWindow();
  }
};
