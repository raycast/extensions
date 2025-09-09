import { exec } from "child_process";
import { Tool } from "@raycast/api";
import { getKillCommand, getPlatformSpecificErrorHelp } from "../utils/platform";

/**
 * Input type for killing a process
 */
type Input = {
  /**
   * App name to kill
   */
  processName?: string;

  /**
   * Process ID to kill
   */
  id: number;

  /**
   * Path to the process to kill
   */
  path?: string;

  /**
   * Whether to force kill the process (requires elevated privileges)
   */
  force?: boolean;
};

/**
 * Kill a process.
 * Provide the process ID to kill.
 * If the process is not found, the tool will return an error.
 */
export default async function killProcess(input: Input) {
  return new Promise((resolve, reject) => {
    const command = getKillCommand(input.id, input.force);

    exec(command, (killErr) => {
      if (killErr) {
        const errorHelp = getPlatformSpecificErrorHelp(input.force || false);
        const error = new Error(`${errorHelp.title}: ${killErr.message}`);
        reject(error);
        return;
      }

      const processInfo = input.processName ? `${input.processName} ` : "";
      resolve({
        success: true,
        message: `Killed process: ${processInfo}(PID: ${input.id})`,
      });
    });
  });
}

/**
 * Because forcibly killing a process can cause data loss or undesired system changes,
 * let's ask for user confirmation before proceeding.
 */
export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const info: { name: string; value: string }[] = [];

  // Only add Process Name if it's provided and non-empty
  if (input.processName) {
    info.push({ name: "Process Name", value: input.processName });
  }

  // Always add PID as it's required
  info.push({ name: "PID", value: String(input.id) });

  // Only add Path if it's provided and non-empty
  if (input.path) {
    info.push({ name: "Path", value: input.path });
  }

  return { info };
};
