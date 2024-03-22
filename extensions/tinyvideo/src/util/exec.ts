import { getPreferenceValues } from "@raycast/api";
import childProcess from "node:child_process";

type Preference = {
  path: string;
};

/**
 * From https://github.com/raycast/extensions/blob/21c9b2babbb3e0c1b6159214cb5619989bed7ee6/extensions/music/src/util/exec.ts
 */
export async function execute(file: string, ...args: string[]) {
  const preferences = getPreferenceValues<Preference>();

  const child = childProcess.spawn(file, args, {
    shell: true,
    env: {
      PATH: preferences.path,
      ...process.env,
    },
  });

  let output = "";
  for await (const chunk of child.stdout) {
    output += chunk;
  }

  let error = "";
  for await (const chunk of child.stderr) {
    error += chunk;
  }

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  if (exitCode) {
    throw new Error(`Failed to execute command, exit-code: ${exitCode}, ${error}`);
  }

  return output;
}
