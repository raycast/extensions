import { DOCKER } from "../orbstack";
import { execAsync } from "../utils";

/**
 * This tool runs `docker container ls -a` in a shell and returns the output.
 * The output is all Docker containers managed by OrbStack, running and stopped.
 *
 * @returns output of shell command
 */
export default async function tool(): Promise<string> {
  const { stdout, stderr } = await execAsync(`${DOCKER} container ls -a`);
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
}
