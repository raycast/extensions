import { homedir } from "os";
import { spawn } from "child_process";

function gopass(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const cli = spawn("gopass", args, {
      env: {
        HOME: homedir(),
        PATH: [
          "/usr/bin", // pbcopy
          "/usr/local/bin", // gpg
          "/usr/local/MacGPG2/bin", // gpg
        ].join(":"),
      },
    });

    cli.on("error", reject);

    const stderr: Buffer[] = [];
    cli.stderr.on("data", (chunk: Buffer): number => stderr.push(chunk));
    cli.stderr.on("end", () => stderr.length > 0 && reject(stderr.join("")));

    const stdout: Buffer[] = [];
    cli.stdout.on("data", (chunk: Buffer): number => stdout.push(chunk));
    cli.stdout.on("end", () => resolve(stdout.join("")));
  });
}

async function list(): Promise<string[]> {
  const entries = await gopass(["list", "--flat"]);
  return entries.split(`\n`);
}

async function password(entry: string): Promise<string> {
  return gopass(["show", "--password", entry]);
}

async function clip(entry: string): Promise<void> {
  await gopass(["show", "--clip", entry]);
}

export default { list, password, clip };
