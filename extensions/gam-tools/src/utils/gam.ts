import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runGam(args: string): Promise<string> {
  const preferences = getPreferenceValues<{ gamPath?: string }>();
  const gamPath = preferences?.gamPath?.trim() || "gam";
  const fullCommand = `"${gamPath}" ${args}`;

  console.log(`[GAM Executing]: ${fullCommand}`);

  try {
    const { stdout, stderr } = await execAsync(fullCommand);

    if (stdout) console.log(`[GAM stdout]:\n${stdout}`);
    if (stderr) console.warn(`[GAM stderr]:\n${stderr}`);

    return stdout;
  } catch (error) {
    console.error(`[GAM Process Failed]:`, error);

    // Log complete stdout & stderr from the process error object
    if (error) console.error(`[GAM Output Before Failure]:\n${error}`);
    if (error) console.error(`[GAM CLI Error Output]:\n${error}`);

    throw error;
  }
}
