import { execAsync } from "../utils";
import { BaseArgs, validateBaseArgs } from "./types";

/**
 * This tool will open a terminal and ssh into the machine.
 * DO NOT call this tool unless the user EXPLICTLY asks you to open or ssh into machine.
 * If a user asks you to run commands or perform actions, then use the machine_execute_command tool instead.
 *
 * This tool requires a machine_name property to the args object.
 *
 * @param args machine to ssh into
 * @returns output of shell command
 */
export default async function tool(args: BaseArgs): Promise<string> {
  validateBaseArgs(args);

  const { stderr } = await execAsync(
    `osascript -e 'tell application "Terminal" to do script "ssh ${args.machine_name}@orb"'`,
  );

  if (stderr) {
    throw new Error(stderr);
  }
  return `${args.machine_name} successfully opened`;
}
