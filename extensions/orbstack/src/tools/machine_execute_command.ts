import { Tool } from "@raycast/api";
import { ORB_CTL } from "../orbstack";
import { execAsync } from "../utils";
import { CommandArgs, validateCommandArgs } from "./types";

// I'm tempted to remove this as I feel that it slows the user down. However, I understand that someone might have
// some important data in the machine and can't risk having it destroyed. It's possible the LLM sends a destructive
// command to the wrong machine. Infinite possibilites. Perhaps in the future I can add a feature to mark machines
// as 'protected' so that they never show up in the list of machines and never allow commands sent to them. Or maybe
// the user has to mark each machine as capable of running commands in. Opt-in or Opt-out by default? Not sure yet.
export const confirmation: Tool.Confirmation<CommandArgs> = async (args) => {
  return {
    message: `Run command "${args.command.join(" ")}" in the machine "${args.machine_name}"?`,
  };
};

/**
 * This tool runs `orbctl run -m <name> <command>` in a shell and returns the output.
 * If you are unsure which machine names are available, run the machine_list tool first.
 * It is OK to send a command to a stopped machine. OrbStack will automatically start
 * the machine and run the command.
 *
 * @param args machine to execute commands in
 * @returns output of shell command
 */
export default async function tool(args: CommandArgs): Promise<string> {
  validateCommandArgs(args);

  try {
    const { stdout } = await execAsync(`${ORB_CTL} run -m ${args.machine_name} ${args.command.join(" ")}`);
    return stdout;
  } catch (error) {
    const { message, stderr, stdout } = error as Error & { stderr: string; stdout: string };
    const hasLocaleWarning = stderr?.includes("-bash: warning: setlocale: LC_ALL: cannot change locale");
    const stdoutSection = stdout || "";
    // relevant info for the setlocale warning: https://github.com/alacritty/alacritty/issues/7360
    const note = hasLocaleWarning
      ? "\n\nNote: The locale warning in this error is a known issue with no fix and can be safely ignored."
      : "";
    throw new Error(`${stderr || message}${stdoutSection}${note}`);
  }
}
