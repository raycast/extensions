import { environment } from "@raycast/api";
import { execSync } from "child_process";
import { chmod } from "fs/promises";
import { join } from "path";

export async function setBrightness(displayID: number, brightness: number) {
  try {
    const cliUtilPath = join(environment.assetsPath, "brightness-cli");
    await chmod(cliUtilPath, "755");
    const result = execSync(`${cliUtilPath} set-brightness ${displayID} ${brightness}`).toString();
    if (result.toLowerCase().includes("error")) throw new Error(result);
    const ok = Boolean(result.trim());
    return {
      ok,
      message: ok ? "Brightness set successfully" : "Failed to set brightness",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "An unknown error occurred while setting brightness.",
    };
  }
}
