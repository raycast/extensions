import { closeMainWindow, environment, getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import util from "util";

export default async function AskAboutScreenContent(props) {
  const { prompt } = getPreferenceValues();
  await closeMainWindow();

  const execPromise = util.promisify(exec);

  await execPromise(`/usr/sbin/screencapture -s ${environment.assetsPath}/selectedScreenshot.png`);

  console.log(`${environment.assetsPath}/desktopScreenshot.png`);

  await launchCommand({
    name: "askAI",
    type: LaunchType.UserInitiated,
    context: {
      buffer: [fs.readFileSync(`${environment.assetsPath}/selectedScreenshot.png`)],
      args: props.arguments,
      context: prompt,
    },
  });
}
