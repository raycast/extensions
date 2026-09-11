import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import sudo from "sudo-prompt";
import { isMockEnabled, mockExec } from "./mockBridge";

export interface ExecDiskOptions {
  sudo?: boolean;
  /** Omit to run without a timeout. On timeout the child is SIGKILL'd. */
  timeoutMs?: number;
}

export async function execDiskCommand(command: string, options?: ExecDiskOptions): Promise<string> {
  if (isMockEnabled()) {
    return mockExec(command);
  }

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
    let timer: NodeJS.Timeout | undefined;
    const child = exec(command, { env }, (error, stdout) => {
      if (timer !== undefined) clearTimeout(timer);
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
    if (options?.timeoutMs !== undefined) {
      timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`Timed out: ${command}`));
      }, options.timeoutMs);
    }
  });
}

export async function openCommandInTerminal(command: string) {
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
  await new Promise((resolve) => setTimeout(resolve, 690));
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
