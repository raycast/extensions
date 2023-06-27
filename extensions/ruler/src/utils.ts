import { environment } from "@raycast/api";
import { execa, ExecaError } from "execa";
import { chmod } from "fs/promises";
import { join } from "path";

export async function runRuler() {
  const command = join(environment.assetsPath, "ruler");
  await chmod(command, "755");

  try {
    const { stdout } = await execa(command);
    return stdout;
  } catch (error) {
    if ((error as ExecaError).stdout === "Invalid points") {
      return undefined;
    } else {
      throw error;
    }
  }
}
