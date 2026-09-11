import { execFile } from "node:child_process";
import { promisify } from "node:util";

export { getDelphitoolsCliPath } from "./preferences";
import { getDelphitoolsCliPath } from "./preferences";

export const execFileAsync = promisify(execFile);

export async function runDelphitools(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(getDelphitoolsCliPath(), args);

    return stdout.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`delphitools ${args.join(" ")} failed: ${message}`);
  }
}
