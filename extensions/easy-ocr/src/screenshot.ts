import { environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import util from "util";
import { execFile } from "child_process";
import path from "path";

const execFilePromise = util.promisify(execFile);

const filePath = path.join(environment.assetsPath, `${Date.now()}.png`);
export default async function takeScreenshot() {
  try {
    // Pass the path as an argv entry instead of interpolating it into a shell
    // command, so spaces or special characters in it can't split the command.
    await execFilePromise("/usr/sbin/screencapture", ["-i", filePath]);
  } catch (e) {
    await showFailureToast(e, { title: "Failed to capture screenshot" });
  }

  return filePath;
}
