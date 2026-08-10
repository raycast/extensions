import { closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

export default async () => {
  exec("/usr/sbin/screencapture -w -p -c");
  await closeMainWindow();
};
