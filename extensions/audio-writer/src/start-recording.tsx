import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { isAudioWriterInstalled } from "./checkInstall";

export default async () => {
  if (await isAudioWriterInstalled()) {
    const url = "audiowriter://record";
    open(url);
    await closeMainWindow();
  } else {
    open("https://audiowriter.app/#raycast");
    await closeMainWindow();
  }
};