import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function execute(file: string, ...args: string[]) {
  const { stdout } = await execFileAsync(file, args, {
    timeout: 10_000,
    killSignal: "SIGKILL",
    env: {
      PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
      ...process.env,
    },
  });

  return stdout;
}
