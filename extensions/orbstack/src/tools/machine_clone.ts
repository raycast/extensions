import { Tool } from "@raycast/api";
import { ORB_CTL } from "../orbstack";
import { execAsync } from "../utils";
import { CloneArgs, validateCloneArgs } from "./types";

function cloneCommand(args: CloneArgs): string {
  return `${ORB_CTL} clone ${args.old_name} ${args.new_name}`;
}

export const confirmation: Tool.Confirmation<CloneArgs> = async (args) => {
  return {
    message: `Run command "${cloneCommand(args)}"? This can take a few minutes to complete.`,
  };
};

/**
 * This tool will run `orbctl clone <old_name> <new_name>` to clone an existing machine.
 * DO NOT call this tool unless the user EXPLICITLY asks to clone a machine.
 *
 * This tool requires the following properties on the args object:
 * - old_name: string — the name of the existing OrbStack machine to clone from.
 * - new_name: string — the target name for the cloned machine (must not contain underscores and must differ from old_name).
 *
 * If the user did not specify a new name, then suffix '-clone' to the end of the old_name.
 * Examples:
 * arch-opencode -> arch-opencode-clone.
 * ubuntu-clone -> ubuntu-clone-clone.
 *
 * @param args clone arguments
 * @returns output of shell command
 */
export default async function tool(args: CloneArgs): Promise<string> {
  validateCloneArgs(args);

  const command = cloneCommand(args);
  const { stdout, stderr } = await execAsync(command, { timeout: 1000 * 120 }); // 2 minutes
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
}
