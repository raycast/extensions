import { environment } from "@raycast/api";
import { exec } from "child_process";
import { chmod } from "fs/promises";
import { join } from "path";

export async function runBackgroundRemoval({ paths }: { paths: string[] }) {
  const command = join(environment.assetsPath, "remove-background");
  await chmod(command, "755");
  const output = await new Promise<string>((resolve, reject) => {
    exec(`${command} ${paths.map((x) => JSON.stringify(x)).join(" ")}`, (err, stdout, stderr) => {
      if (err) {
        // get stdout
        reject(stdout + " " + stderr);
      }
      resolve(stdout);
    });
  });

  return output;
}
