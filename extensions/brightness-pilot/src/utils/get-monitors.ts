import { environment } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { chmod } from "fs/promises";
import { join } from "path";
import { Monitor } from "../types";

const execAsync = promisify(exec);

export async function getMonitors() {
  try {
    const cliUtilPath = join(environment.assetsPath, "brightness-cli");
    await chmod(cliUtilPath, "755");
    const { stdout, stderr } = await execAsync(`${cliUtilPath} detect-displays`);
    if (stderr) throw new Error(stderr);
    return JSON.parse(stdout) as Monitor[];
  } catch {
    throw new Error("Something went wrong while trying to get monitors. Please try again later.");
  }
}
