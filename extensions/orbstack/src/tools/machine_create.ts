import { Tool } from "@raycast/api";
import { ORB_CTL } from "../orbstack";
import { execAsync } from "../utils";
import { CreateArgs, validateCreateArgs } from "./types";

function createMachineCommand(args: CreateArgs): string {
  const arch = " -a " + args.architecture + " ";
  const user_name = args.user_name ? ` -u ${args.user_name} ` : "";
  const distro = args.version ? `${args.distro}:${args.version} ` : args.distro + " ";
  return `${ORB_CTL} create${arch}${user_name}${distro}${args.machine_name}`;
}

export const confirmation: Tool.Confirmation<CreateArgs> = async (args) => {
  if (args.architecture === undefined) {
    args.architecture = "arm64";
  }

  return {
    message: `Run command "${createMachineCommand(args)}"? This can take a few minutes to complete.`,
  };
};

/**
 * This tool runs `orbctl create [-a <arch>] [-u <user_name>] <distro>[:<version>] <machine_name>` in a shell and returns the output.
 * If the user did specify a distro or machine name, you NEED TO ASK them for both. These values are required.
 *
 * @param args machine to execute commands in
 * @returns output of shell command
 */
export default async function tool(args: CreateArgs): Promise<string> {
  // We have to set architecture again even though we set it in `confirmation` above.
  // It appears confirmation and tool get call with their own copies of the original data.
  if (args.architecture === undefined) {
    args.architecture = "arm64";
  }

  validateCreateArgs(args);

  const command = createMachineCommand(args);

  const { stdout, stderr } = await execAsync(command, { timeout: 1000 * 120 }); // Let's wait 2 minutes at most.
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
}
