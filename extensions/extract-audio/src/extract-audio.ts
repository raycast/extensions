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

export default async function main() {
  if (!isFfmpegInstalled()) {
    showHUD("ffmpeg is not installed");
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
    title: `Extracting audio`,
  });

  const filePaths = items.map((item) => item.path);

  const promises = filePaths.map((filePath) => {
    return new Promise((resolve, reject) => {
      const outputFilePath = filePath.replace(".mp4", ".mp3");
      const command = `ffmpeg -i "${filePath}" -vn -map 0:a:0 -ar 44100 -ab 192k "${outputFilePath}"`;
      const p = spawn(command, { shell: true, stdio: "inherit", env: process.env });
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
    const firstFilePath = filePaths[0];
    closeMainWindow();
    await showInFinder(firstFilePath.replace(".mp4", ".mp3"));
  } catch (error) {
    console.error("One or more errors occurred during audio extraction:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: `Error extracting audio`,
      message: (error as Error).message,
    });
  }
}
