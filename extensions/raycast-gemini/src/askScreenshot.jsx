import { closeMainWindow, environment, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import util from "util";

export default async function askScreenshot(props, prompt, isSelecting) {
  await closeMainWindow();

  const execPromise = util.promisify(exec);

  const screenshotPath = `${environment.assetsPath}/screenshot.png`;
  // if isSelecting is true, cmd add -s to screencaptureCmd
  const screencaptureCmd = `/usr/sbin/screencapture ${isSelecting ? "-s" : ""} ${screenshotPath}`;

  let fileBuffer;
  try {
    await execPromise(screencaptureCmd);
    fileBuffer = await fs.promises.readFile(screenshotPath);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get screenshot",
      message: error.message,
    });
    return;
  }

  console.log(`Screenshot captured at ${screenshotPath}`);

  try {
    await launchCommand({
      name: "askAI",
      type: LaunchType.UserInitiated,
      context: {
        buffer: [fileBuffer],
        args: props.arguments,
        context: prompt,
      },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch askAI command",
      message: error.message,
    });
  }
}
