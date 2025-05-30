import { closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

export default async () => {
  exec(`/Applications/Snipaste.app/Contents/MacOS/Snipaste toggle-images`);

  await closeMainWindow();
};
