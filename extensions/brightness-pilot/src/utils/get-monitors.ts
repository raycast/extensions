import { environment } from "@raycast/api";
import { execSync } from "child_process";
import { chmod } from "fs/promises";
import { join } from "path";
import { Monitor } from "../types";

export async function getMonitors() {
  try {
    const cliUtilPath = join(environment.assetsPath, "brightness-cli");
    await chmod(cliUtilPath, "755");
    const result = execSync(`${cliUtilPath} detect-displays`).toString();
    return JSON.parse(result) as Monitor[];
  } catch {
    throw new Error("Something went wrong while trying to get monitors. Please try again later.");
  }
}
