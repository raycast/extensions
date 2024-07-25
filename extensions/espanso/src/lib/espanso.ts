import { getPreferenceValues } from "@raycast/api";
import { cpus } from "os";
import { exec } from "child_process";

function execAsync(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function espanso(args: string) {
  const preferences = getPreferenceValues<Preferences>();

  const espansoPath: string = preferences.espansoPath?.length
    ? preferences.espansoPath
    : cpus()[0].model.includes("Apple")
      ? "/opt/homebrew/bin/espanso"
      : "/usr/local/bin/espanso";

  const res = await execAsync(`${espansoPath} ${args}`);

  return res;
}
