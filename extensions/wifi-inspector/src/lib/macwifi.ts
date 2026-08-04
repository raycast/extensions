import { execFile } from "child_process";
import { promisify } from "util";

import { ensureCli } from "./ensure-cli";
import { isAppleSilicon } from "./resolve-cli";
import { isDisconnectedInfo, isWifiNetwork, type PasswordResult, type WifiNetwork } from "./types";

const execFileAsync = promisify(execFile);

const CLI_ENV = {
  LANG: "en_US.UTF-8",
  LC_ALL: "en_US.UTF-8",
};

export class MacwifiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MacwifiError";
  }
}

async function runCli(
  args: string[],
  options?: { forceDownload?: boolean; timeoutMs?: number },
): Promise<{
  cliPath: string;
  stdout: string;
}> {
  if (!isAppleSilicon()) {
    throw new MacwifiError(
      "macwifi-cli requires an Apple Silicon Mac. Intel Macs are not supported by the underlying Wi-Fi helper.",
    );
  }

  const cliPath = await ensureCli({ forceDownload: options?.forceDownload });

  try {
    const result = await execFileAsync(cliPath, args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: options?.timeoutMs ?? 45_000,
      env: {
        ...process.env,
        ...CLI_ENV,
      },
    });
    return { cliPath, stdout: result.stdout };
  } catch (error) {
    const err = error as { stderr?: string; message?: string; code?: string | number; stdout?: string };
    if (err.code === "ETIMEDOUT") {
      throw new MacwifiError("macwifi-cli timed out. Approve Location Services if macOS prompted you.");
    }
    // password not-found exits with code 2 and may still print JSON to stdout
    if (err.code === 2 && err.stdout) {
      return { cliPath, stdout: err.stdout };
    }
    const detail = (err.stderr || err.message || "Unknown error").trim();
    throw new MacwifiError(`macwifi-cli failed: ${detail}`);
  }
}

function parseJson<T>(stdout: string, label: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new MacwifiError(`Could not parse macwifi-cli ${label} JSON output.`);
  }
}

export async function scanNetworks(options?: { forceDownload?: boolean }): Promise<{
  cliPath: string;
  networks: WifiNetwork[];
  raw: string;
}> {
  const { cliPath, stdout } = await runCli(["scan", "--json"], options);
  const parsed = parseJson<unknown>(stdout, "scan");
  if (!Array.isArray(parsed) || !parsed.every(isWifiNetwork)) {
    throw new MacwifiError("macwifi-cli scan JSON is not a network array.");
  }
  return { cliPath, networks: parsed, raw: stdout };
}

export async function currentConnection(options?: { forceDownload?: boolean }): Promise<{
  cliPath: string;
  network: WifiNetwork | null;
  raw: string;
}> {
  const { cliPath, stdout } = await runCli(["info", "--json"], options);
  const parsed = parseJson<unknown>(stdout, "info");

  if (isDisconnectedInfo(parsed)) {
    return { cliPath, network: null, raw: stdout };
  }
  if (!isWifiNetwork(parsed)) {
    throw new MacwifiError("macwifi-cli info JSON is not a network object.");
  }
  return { cliPath, network: parsed, raw: stdout };
}

export async function fetchWifiPassword(ssid: string): Promise<PasswordResult> {
  const { stdout } = await runCli(["password", ssid, "--json", "--no-prompt-hint"], { timeoutMs: 90_000 });
  const parsed = parseJson<PasswordResult>(stdout, "password");
  if (typeof parsed.ssid !== "string" || typeof parsed.found !== "boolean") {
    throw new MacwifiError("macwifi-cli password JSON is malformed.");
  }
  return parsed;
}
