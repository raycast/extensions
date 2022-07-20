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
          "/opt/homebrew/bin", // homebrew on macOS Apple Silicon
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

async function list({ limit = -1, prefix = "" } = {}): Promise<string[]> {
  const entries = await gopass(["list", `--limit=${limit}`, "--flat", prefix]);
  return entries.split(`\n`).filter((item) => item.length);
}

async function password(entry: string): Promise<string> {
  return gopass(["show", "--password", entry]);
}

async function clip(entry: string): Promise<void> {
  await gopass(["show", "--clip", entry]);
}

async function show(entry: string): Promise<string[]> {
  // gopass has no option to disable printing the password in the first, therefor we use `slice`
  return await gopass(["show", entry])
    .then((data) => data.split(`\n`).slice(1))
    // Filter out details not in YAML colon syntax "key: value", such as GOPASS-SECRET-1.0
    .then((data) => data.filter((item) => item.includes(":")));
}

export default { list, password, clip, show };
