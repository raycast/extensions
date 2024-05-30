import { environment, closeMainWindow, launchCommand, LaunchType } from "@raycast/api";
import util from "util";
import { exec } from "child_process";
import fs from "fs";
import jimp from "jimp";

export default async function AskAboutScreenContent(props) {
  await closeMainWindow();

  const execPromise = util.promisify(exec);

  await execPromise(`/usr/sbin/screencapture ${environment.assetsPath}/desktopScreenshot.png`);

  console.log(`${environment.assetsPath}/desktopScreenshot.png`);

  await launchCommand({
    name: "askAI",
    type: LaunchType.UserInitiated,
    context: {
      buffer: [fs.readFileSync(`${environment.assetsPath}/desktopScreenshot.png`)],
      args: props.arguments,
    },
  });
}
