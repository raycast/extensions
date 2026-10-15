import {
  closeSync,
  existsSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Settings, executable, run } from "./core";

/** Compares dotted version numbers such as `2026.08.19` and `2026.9.1.1`. */
export function compareVersions(a: string, b: string): number {
  const parts = (value: string) =>
    value
      .trim()
      .replace(/^v/i, "")
      .split(".")
      .map((part) => parseInt(part, 10) || 0);
  const left = parts(a);
  const right = parts(b);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

export async function ytDlpVersion(settings: Settings): Promise<string> {
  const bin = await executable(settings.ytDlpPath, "yt-dlp");
  return (await run(bin, ["--ignore-config", "--version"])).trim();
}

/** The newest yt-dlp release on GitHub. */
export async function latestYtDlpVersion(
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(
    "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest",
    { headers: { Accept: "application/vnd.github+json" }, signal },
  );
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
  const release = (await response.json()) as { tag_name?: unknown };
  if (typeof release.tag_name !== "string")
    throw new Error("GitHub did not return a yt-dlp version.");
  return release.tag_name;
}

export type UpdateCommand = {
  bin: string;
  args: string[];
  /** How the user would run it in Terminal. */
  display: string;
  env?: NodeJS.ProcessEnv;
};

function firstLine(path: string): string {
  const buffer = Buffer.alloc(200);
  const file = openSync(path, "r");
  try {
    const length = readSync(file, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, length).toString("utf8").split("\n")[0];
  } finally {
    closeSync(file);
  }
}

/**
 * How to update yt-dlp, based on where it is installed: Homebrew, pipx, pip,
 * or the standalone release that updates itself.
 */
export function updateCommand(
  bin: string,
  resolved: string,
  shebang: string,
): UpdateCommand {
  const cellar = resolved.indexOf("/Cellar/yt-dlp/");
  if (cellar >= 0) {
    const prefix = resolved.slice(0, cellar);
    return {
      bin: join(prefix, "bin", "brew"),
      args: ["upgrade", "yt-dlp"],
      display: "brew upgrade yt-dlp",
      env: {
        PATH: `${join(prefix, "bin")}:/usr/bin:/bin:/usr/sbin:/sbin`,
        HOME: homedir(),
        HOMEBREW_NO_ENV_HINTS: "1",
      },
    };
  }
  if (/\/pipx\/venvs\/yt-dlp\//.test(resolved)) {
    const pipx = [
      join(homedir(), ".local", "bin", "pipx"),
      "/opt/homebrew/bin/pipx",
      "/usr/local/bin/pipx",
    ].find(existsSync);
    return {
      bin: pipx ?? "pipx",
      args: ["upgrade", "yt-dlp"],
      display: "pipx upgrade yt-dlp",
    };
  }
  const python = /^#!\s*(?:\/usr\/bin\/env\s+)?(\S*python[\d.]*)\s*$/.exec(
    shebang,
  )?.[1];
  if (python)
    return {
      bin: python,
      args: ["-m", "pip", "install", "--upgrade", "yt-dlp"],
      display: `${python} -m pip install --upgrade yt-dlp`,
    };
  return {
    bin,
    args: ["--ignore-config", "-U"],
    display: `${bin} --ignore-config -U`,
  };
}

export async function ytDlpUpdateCommand(
  settings: Settings,
): Promise<UpdateCommand> {
  const bin = await executable(settings.ytDlpPath, "yt-dlp");
  const resolved = realpathSync(bin);
  let shebang = "";
  try {
    shebang = firstLine(resolved);
  } catch {
    /* unreadable; treat as a standalone binary */
  }
  return updateCommand(bin, resolved, shebang);
}

/** Updates yt-dlp and returns the version installed afterwards. */
export async function updateYtDlp(settings: Settings): Promise<string> {
  const command = await ytDlpUpdateCommand(settings);
  try {
    await run(command.bin, command.args, undefined, undefined, command.env);
  } catch (error) {
    throw new Error(
      `Updating yt-dlp failed. Run “${command.display}” in Terminal to see why.\n\n${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return await ytDlpVersion(settings);
}
