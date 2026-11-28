import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const exec = promisify(execFile);

const BREW_CANDIDATES = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];
const INSTALL_TIMEOUT_MILLISECONDS = 15 * 60_000;

export interface DependencyState {
  brew: string | null;
  mitmweb: boolean;
  jq: boolean;
}

// The control script resolves these with `command -v` in the same environment,
// so asking the same question here keeps the setup screen and the script in step.
async function onPath(name: string): Promise<boolean> {
  try {
    await exec("/bin/zsh", ["-c", `command -v ${name}`]);
    return true;
  } catch {
    return false;
  }
}

export async function readDependencyState(): Promise<DependencyState> {
  const brew =
    BREW_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;
  const [mitmweb, jq] = await Promise.all([onPath("mitmweb"), onPath("jq")]);
  return { brew, mitmweb, jq };
}

export function isReady(state: DependencyState): boolean {
  return state.mitmweb && state.jq;
}

export async function installDependencies(brew: string): Promise<void> {
  const options = {
    timeout: INSTALL_TIMEOUT_MILLISECONDS,
    maxBuffer: 16 * 1024 * 1024,
  };
  await exec(brew, ["install", "--cask", "mitmproxy"], options);
  await exec(brew, ["install", "jq"], options);
}

// The control script names the missing binary and the command that installs it.
export function isMissingDependency(error: Error): boolean {
  return /not found — install it with/.test(error.message);
}
