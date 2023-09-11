import { closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

export default async () => {
  exec("/usr/sbin/screencapture -i -P");
  await closeMainWindow();
};
