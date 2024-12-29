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
    return await gopass([
      "pwgen",
      "--xkcd",
      `--sep=-`,
      `--xkcdcapitalize=${capitalize}`,
      `--xkcdnumbers=${numbers}`,
      `${length}`,
    ]).then((data) => data.split(`\n`));
  }
  return await gopass(["pwgen", `--symbols=${symbols}`, `--no-numerals=${!digits}`, `${length}`]).then((data) =>
    data.split(`\n`)
  );
}

async function password(entry: string): Promise<string> {
  return gopass(["show", "--password", entry]);
}

async function otp(entry: string): Promise<string> {
  return gopass(["otp", "--password", entry]);
}

async function clip(entry: string): Promise<void> {
  await gopass(["show", "--clip", entry]);
}

async function remove(entry: string, force = false): Promise<void> {
  await gopass(["remove", `--force=${force}`, entry]);
}

async function insert(entry: string, data: string, force = false): Promise<void> {
  await gopass(["insert", `--force=${force}`, entry], data);
}

interface showAllResponse {
  password: string;
  attributes: string[];
}
async function showAll(entry: string): Promise<showAllResponse> {
  const data = await gopass(["show", entry]).then((data) => data.split(`\n`));
  return {
    password: data[0],
    attributes: data.slice(1).filter((item) => item.includes(":")),
  };
}

async function show(entry: string): Promise<string[]> {
  // gopass has no option to disable printing the password in the first, therefor we use `slice`
  return await gopass(["show", entry])
    .then((data) => data.split(`\n`).slice(1))
    // Filter out details not in YAML colon syntax "key: value", such as GOPASS-SECRET-1.0
    .then((data) => data.filter((item) => item.includes(":")));
}

export default { list, password, clip, show, otp, pwgen, showAll, insert, remove };
