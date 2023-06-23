import { environment } from "@raycast/api";
import { execa, ExecaError } from "execa";
import { chmod } from "fs/promises";
import { join } from "path";

export async function runRuler() {
  const command = join(environment.assetsPath, "ruler");
  await chmod(command, "755");

  try {
    if (environment.isDevelopment) {
      const filePath = "/Users/anwar/Documents/projects/personal/ruler/Sources/ruler/main.swift";
      // const filePath = "";
      if (filePath) {
        const { stdout } = await execa("swift", [filePath]);
        return stdout;
      }

      throw new Error("No file path");
    }

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
