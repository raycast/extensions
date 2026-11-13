import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";

const execFilePromise = promisify(execFile);

export default async () => {
  await closeMainWindow();
  try {
    await execFilePromise("/usr/bin/open", ["-a", "Screenshot"]);
  } catch (error) {
    await showFailureToast(error, { title: "Could not launch Screenshot app" });
  }
};
