import { Tool } from "@raycast/api";
import { ORB_CTL } from "../orbstack";
import { execAsync } from "../utils";
import { CloneArgs, validateCloneArgs } from "./types";

function renameCommand(args: CloneArgs): string {
  return `${ORB_CTL} rename ${args.old_name} ${args.new_name}`;
}

export const confirmation: Tool.Confirmation<CloneArgs> = async (args) => {
  return { message: `Run command "${renameCommand(args)}"? This will rename the machine.` };
};

export default async function tool(args: CloneArgs): Promise<string> {
  // reuse CloneArgs validation (old_name/new_name rules are identical)
  validateCloneArgs(args);

  const { stdout, stderr } = await execAsync(renameCommand(args), { timeout: 1000 * 60 });
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
}
