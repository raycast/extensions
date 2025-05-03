import { closeMainWindow, showHUD, open } from "@raycast/api";
import { isAudioWriterInstalled } from "./checkInstall";

export default async () => {
  try {
    const isInstalled = await isAudioWriterInstalled();
    if (isInstalled) {
      const url = "audiowriter://record";
      open(url);
      await closeMainWindow();
    } else {
      open("https://audiowriter.app/#raycast");
      await closeMainWindow();
    }
  } catch (error) {
    console.error(error);
    showHUD("Unable to open AudioWriter.");
  }
};
