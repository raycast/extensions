import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";
import { goToChapter } from "./utils";

export default async () => {
  if (await runJSInYouTubeMusicTab(goToChapter.next)) {
    await closeMainWindow();
  }
};
