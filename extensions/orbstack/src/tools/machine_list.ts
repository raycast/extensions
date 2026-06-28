import { ORB_CTL } from "../orbstack";
import { execAsync } from "../utils";

/**
 * This tool runs `orbctl list` in a shell and returns the output.
 * The output is all machines currently installed in OrbStack.
 *
 * @returns output of shell command
 */
export default async function tool(): Promise<string> {
  const { stdout, stderr } = await execAsync(`${ORB_CTL} list`);
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
}
