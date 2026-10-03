import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { DisplayController, helperTimeout } from "./core";

export const controller = new DisplayController(
  (args) =>
    new Promise((resolve, reject) => {
      const arch = process.arch;
      if (arch !== "arm64" && arch !== "x64") {
        reject(new Error(`Unsupported architecture: ${arch}`));
        return;
      }
      const helper = join(environment.assetsPath, `display-control-${arch === "x64" ? "x86_64" : "arm64"}`);
      execFile(helper, args, { timeout: helperTimeout(args[0]), maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error)
          reject(
            new Error(
              stderr.trim() ||
                `Unable to run the display helper. Rebuild or reinstall Display Switch. ${error.message}`,
            ),
          );
        else resolve(stdout);
      });
    }),
);

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
