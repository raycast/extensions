import { closeMainWindow } from "@raycast/api";
import { runJSInYandexMusicTab, wrapJS } from "./utils";

export default async () => {
  if (
    await runJSInYandexMusicTab(
      wrapJS(`
        const nodes = document.querySelectorAll('button[aria-label=Playback]');
        nodes[nodes.length - 1].click();
      `)
    )
  ) {
    await closeMainWindow();
  }
};
