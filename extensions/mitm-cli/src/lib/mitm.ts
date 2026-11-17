import { environment, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface Preferences {
  mitmPath?: string;
}

function resolveScript(): string {
  const { mitmPath } = getPreferenceValues<Preferences>();
  const candidates = [
    mitmPath,
    join(environment.assetsPath, "mitm"),
    `${homedir()}/scripts/mitm`,
    "/opt/homebrew/bin/mitm",
    "/usr/local/bin/mitm",
  ].filter((candidate): candidate is string =>
    Boolean(candidate && candidate.trim()),
  );

  const script = candidates.find((candidate) => existsSync(candidate));
  if (!script) {
    throw new Error(
      "mitm script not found. Reinstall the extension, or set a custom path in the extension preferences.",
    );
  }
  return script;
}

export async function runMitm(arguments_: string[]): Promise<string> {
  const { stdout } = await execFileAsync(
    "/bin/zsh",
    [resolveScript(), ...arguments_],
    {
      timeout: 30_000,
    },
  );
  return stdout.trim();
}

async function runMitmJson<Result>(arguments_: string[]): Promise<Result> {
  const output = await runMitm([...arguments_, "--json"]);
  return JSON.parse(output) as Result;
}

export interface ProxyStatus {
  running: boolean;
  pid: number | null;
  ui: string;
  password: string | null;
  service: string | null;
  interface: string | null;
  proxy: boolean;
  https: boolean;
  bypass: string[];
  ca: boolean;
}

export interface Flow {
  id: string;
  method: string;
  scheme: string;
  host: string;
  path: string;
  status: number;
  size: number;
  started: number;
  duration: number;
}

export function getStatus(): Promise<ProxyStatus> {
  return runMitmJson<ProxyStatus>(["status"]);
}

export function getFlows(count = 200): Promise<Flow[]> {
  return runMitmJson<Flow[]>(["flows", String(count)]);
}
