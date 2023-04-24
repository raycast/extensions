import { closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

export default async () => {
  exec("/System/Applications/Utilities/Screenshot.app/Contents/MacOS/Screenshot");
  await closeMainWindow();
};
