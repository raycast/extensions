import { homedir } from "os";
import { spawn } from "child_process";
import { sortDirectoriesFirst } from "./utils";

function gopass(args: string[], stdin?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const cli = spawn("gopass", args, {
      env: {
        HOME: homedir(),
        PATH: [
          "/bin", // osascript
          "/usr/bin", // osascript
          "/usr/local/bin", // gpg
          "/usr/local/MacGPG2/bin", // gpg
          "/opt/homebrew/bin", // homebrew on macOS Apple Silicon
          "/run/current-system/sw/bin", // Nix
        ].join(":"),
      },
    });
    if (stdin) {
      cli.stdin.write(stdin);
      cli.stdin.end();
    }

    cli.on("error", reject);

    const stderr: Buffer[] = [];
    cli.stderr.on("data", (chunk: Buffer): number => stderr.push(chunk));
    cli.stderr.on("end", () => stderr.length > 0 && reject(stderr.join("")));

    const stdout: Buffer[] = [];
    cli.stdout.on("data", (chunk: Buffer): number => stdout.push(chunk));
    cli.stdout.on("end", () => resolve(stdout.join("")));
  });
}

async function list({ limit = -1, prefix = "", directoriesFirst = false, stripPrefix = false } = {}): Promise<
  string[]
> {
  return await gopass(["list", `--limit=${limit}`, "--flat", `--strip-prefix=${stripPrefix}`, prefix])
    .then((data) => data.split(`\n`))
    .then((data) => data.filter((item) => item.length))
    .then((data) => (directoriesFirst ? sortDirectoriesFirst(data) : data));
}

async function pwgen(
  type: string,
  length: number,
  symbols: boolean,
  digits: boolean,
  capitalize: boolean,
  numbers: boolean
): Promise<string[]> {
  if (type === "xkcd") {
    return gopass([
      "pwgen",
      "--xkcd",
      `--sep=-`,
      `--xkcdcapitalize=${capitalize}`,
      `--xkcdnumbers=${numbers}`,
      `${length}`,
    ]).then((data) => data.split(`\n`).slice(0, -1)); // last line is empty
  }
  return gopass(["pwgen", `--symbols=${symbols}`, `--no-numerals=${!digits}`, `${length}`]).then((data) =>
    data.split(`\n`).slice(0, -1)
  ); // last line is empty
}

async function password(entry: string): Promise<string> {
  return gopass(["show", "--password", entry]);
}

async function otp(entry: string): Promise<string> {
  return gopass(["otp", "--password", entry]);
}

async function exists(entry: string): Promise<boolean> {
  // gopass has no exist command - we can use `list` and base the result on catching the error (doesnt exist)
  try {
    await gopass(["list", entry]);
    return true;
  } catch (error) {
    return false;
  }
}

async function sync(): Promise<void> {
  await gopass(["sync"]);
}

async function clip(entry: string): Promise<void> {
  await gopass(["show", "--clip", entry]);
}

async function remove(entry: string, force = false): Promise<void> {
  await gopass(["remove", `--force=${force}`, entry]);
}

async function move(from: string, to: string, force = false): Promise<void> {
  await gopass(["move", `--force=${force}`, from, to]);
}

async function insert(entry: string, data: string, force = false): Promise<void> {
  await gopass(["insert", `--force=${force}`, entry], data);
}

interface showResponse {
  password: string;
  attributes: string[];
}
async function show(entry: string): Promise<showResponse> {
  const data = await gopass(["show", entry]).then((data) => data.split(`\n`));
  return {
    password: data[0],
    attributes: data.slice(1).filter((item) => item.includes(":")),
  };
}

export default { list, password, clip, show, otp, sync, pwgen, insert, remove, move, exists };
