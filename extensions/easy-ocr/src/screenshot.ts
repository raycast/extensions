import { environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import util from "util";
import { exec } from "child_process";
import path from "path";

const execPromise = util.promisify(exec);

const filePath = path.join(environment.assetsPath, `${Date.now()}.png`);
const command = "/usr/sbin/screencapture -i " + filePath;
export default async function takeScreenshot() {
  try {
    await execPromise(command);
  } catch (e) {
    await showFailureToast(e, { title: "Failed to capture screenshot" });
  }

  return filePath;
}
