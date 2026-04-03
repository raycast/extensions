import { exec } from "child_process";
import { Tool } from "@raycast/api";
import { getKillAllCommand, getPlatformSpecificErrorHelp } from "../utils/platform";

type Input = {
  /**
   * Exact process name to kill all instances of (e.g. "node", "Google Chrome Helper")
   */
  processName: string;

  /**
   * Whether to force kill with elevated privileges
   */
  force?: boolean;
};

/**
 * Kill all processes matching a given name using killall (macOS) or taskkill /IM (Windows).
 * Provide the exact process name. All running instances with that name will be terminated.
 */
export default async function killAllProcesses(input: Input) {
  const processName = input.processName.trim();
  if (!processName || processName === "-") {
    throw new Error("A valid process name is required");
  }

  return new Promise((resolve, reject) => {
    const command = getKillAllCommand(processName, input.force);

    exec(command, (err) => {
      if (err) {
        const errorHelp = getPlatformSpecificErrorHelp(input.force ?? false);
        reject(new Error(`${errorHelp.title}: ${err.message}`));
        return;
      }

      resolve({
        success: true,
        message: `Killed all "${processName}" processes`,
      });
    });
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const info: { name: string; value: string }[] = [{ name: "Process Name", value: input.processName }];

  if (input.force) {
    info.push({ name: "Force", value: "Yes (elevated privileges)" });
  }

  return { info };
};
