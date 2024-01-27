import { exec, execSync } from "child_process";
import { runAppleScript } from "@raycast/utils";

/**
 * Runs a terminal command asynchronously.
 * @param command The command to run.
 * @param callback A callback function to run on each line of output.
 */
export const runCommand = async (command: string, callback?: (arg0: string) => unknown) => {
  const child = exec(command);
  let result = "";

  child.stdout?.on("data", (data: string) => {
    result = result + data;
    callback?.(result);
  });

  while (child.stdout?.readable) {
    await new Promise((r) => setTimeout(r, 100));
  }

  return result;
};

/**
 * Runs a terminal command synchronously.
 * @param command The command to run.
 * @returns The result of the command as a string.
 */
export const runCommandSync = (command: string) => {
  const result = execSync(command);
  return result.toString();
};

/**
 * Runs Terminal command in a new Terminal tab.
 * @param command The command to run.
 * @returns A promise resolving to the output of the command as a string.
 */
export const runCommandInTerminal = async (command: string): Promise<string> => {
  const output = await runAppleScript(`tell application "Terminal"
    try
      activate
      do script "${command.replaceAll('"', '\\"')}"
    end try
  end tell`);
  return output;
};

/**
 * Cuts off a string at a certain length, adding an ellipsis if necessary.
 * @param str The string to modify.
 * @param cutoff The maximum length of the string.
 * @returns The modified string.
 */
export const cutoff = (str: string, cutoff: number) => {
  return `${str.substring(0, cutoff)}${str.length > cutoff ? "..." : ""}`;
};

/**
 * Pluralizes a string based on a count.
 * @param str The string to pluralize.
 * @param count The count to base the pluralization on.
 * @returns The pluralized string.
 */
export const pluralize = (str: string, count: number) => {
  return `${str}${count === 1 ? "" : "s"}`;
};
