import { environment } from "@raycast/api";
import util from "util";
import { exec } from "child_process";

const execPromise = util.promisify(exec);

const filePath = environment.assetsPath + "/" + Date.now() + ".png";
const command = "/usr/sbin/screencapture -i " + filePath;
export default async function takeScreenshot() {
  try {
    await execPromise(command);
import { environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import util from "util";
import { exec } from "child_process";
  return filePath;
}
