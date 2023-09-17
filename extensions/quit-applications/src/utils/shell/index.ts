import { exec } from "child_process";
import { promisify } from "util";

import { toBase64 } from "../common";

const execASync = promisify(exec);

export async function shellWithOutput(command: string): Promise<string> {
  const { stdout, stderr } = await execASync(command);

  if (stderr) {
    throw new Error(stderr);
  }

  return stdout;
}

export async function applescript(command: string): Promise<string> {
  const base64Command = toBase64(command);
  const results = await shellWithOutput(`echo "${base64Command}" | base64 --decode | osascript`);
  return results;
}
