import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import sudo from "sudo-prompt";

export async function execDiskCommand(command: string, options?: { sudo?: boolean }): Promise<string> {
  const env = {
    ...process.env,
    PATH: `${process.env.PATH ?? ""}:/usr/sbin:/usr/bin`,
    USER: process.env.USER ?? "root",
  };

  if (options?.sudo) {
    return new Promise<string>((resolve, reject) => {
      const sudoOptions = {
        name: "Raycast Diskutil",
        env,
      };
      sudo.exec(command, sudoOptions, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout?.toString() || "");
        }
      });
    });
  }

  return new Promise<string>((resolve, reject) => {
    exec(command, { env }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function openCommandInTerminal(command: string) {
  // Execute AppleScript to open a new Terminal window and run the command
  const fullCommand = `
    osascript -e 'tell application "Terminal"
    activate
    do script "${command}"
    delay 1
    set frontmost of the first window to true
    end tell'
`;

  showToast({
    style: Toast.Style.Animated,
    title: `Opening "${command}" in terminal...`,
  });
  await new Promise((resolve) => setTimeout(resolve, 690)); // delay
  showToast({
    style: Toast.Style.Success,
    title: `Opened "${command}" in terminal`,
  });
  try {
    await execDiskCommand(fullCommand);
  } catch (error) {
    showFailureToast(error, { title: "Failed to open terminal" });
  }
}
