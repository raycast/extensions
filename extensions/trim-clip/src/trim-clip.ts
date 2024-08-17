import { closeMainWindow, getSelectedFinderItems, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { execSync, spawn } from "child_process";
import os from "os";

function getUserShellPath() {
  const shell = os.userInfo().shell || "/bin/sh";
  const command = `${shell} -l -i -c 'echo $PATH'`;

  try {
    const path = execSync(command).toString().trim();
    return path;
  } catch (error) {
    console.error("Error retrieving shell PATH:", error);
    return process.env.PATH || "";
  }
}

process.env.PATH = getUserShellPath();

function isFfmpegInstalled() {
  try {
    execSync("ffmpeg -version");
    return true;
  } catch (error) {
    return false;
  }
}

export default async function main(props: { arguments: { start: string; end: string } }) {
  const { start, end } = props.arguments;
  if (!isFfmpegInstalled()) {
    showHUD("ffmpeg is not installed");
    return;
  }
  // if neither start nor end is provided, show toast to tell user to provide start and end
  if (!start && !end) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Please provide start or end arguments`,
    });
    return;
  }

  const items = await getSelectedFinderItems();
  if (!items.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: `No files selected`,
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: `Trimming clip`,
  });

  const filePaths = items.map((item) => item.path);

  let toShowInFinder = "";
  const promises = filePaths.map((filePath) => {
    return new Promise((resolve, reject) => {
      const outputFilePath = filePath.replace(/\.[^/.]+$/, `-trimmed-${start || "start"}-${end || "end"}$&`);
      toShowInFinder = outputFilePath;
      let command = `ffmpeg -y -hide_banner -nostdin -i "${filePath}"`;
      if (start) {
        command += ` -ss ${start}`;
      }
      if (end) {
        command += ` -to ${end}`;
      }
      command += ` -c:a copy -c:v copy "${outputFilePath}"`;
      const p = spawn(command, { shell: true, env: process.env });

      p.stdout.on("data", (data) => {
        console.log(`${data}`);
      });

      p.stderr.on("data", (data) => {
        console.error(`${data}`);
      });

      p.on("exit", (code) => {
        if (code === 0) {
          resolve(outputFilePath);
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });
    });
  });

  try {
    await Promise.all(promises);

    closeMainWindow();
    await showInFinder(toShowInFinder);
  } catch (error) {
    console.error("One or more errors occurred during clip trimming:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: `Error trimming clip`,
      message: (error as Error).message,
    });
  }
}
