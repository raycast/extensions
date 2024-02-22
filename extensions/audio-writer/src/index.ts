import { closeMainWindow } from "@raycast/api";
import open from "open";
import { isAudioWriterInstalled } from "./checkInstall";

export default async () => {
  if (await isAudioWriterInstalled()) {
    const url = 'https://audiowriter.com';
    open(url);
  } else {
    open('https://audiowriter.app/#raycast');
    
  }

  await closeMainWindow();
};