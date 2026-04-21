import { ORB_CTL } from "../orbstack";
import { execAsync } from "../utils";
import { BaseArgs, validateBaseArgs } from "./types";

/**
 * This tool runs `orbctl info <name>` in a shell and returns the output.
 * If you are unsure which machine names are available, run the machine_list tool first.
 *
 * This tool requires a machine_name property to the args object.
 *
 * @param args machine to get info from
 * @returns output of shell command
 */
export default async function tool(args: BaseArgs): Promise<string> {
  validateBaseArgs(args);

  const { stdout, stderr } = await execAsync(`${ORB_CTL} info ${args.machine_name}`);
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
}
