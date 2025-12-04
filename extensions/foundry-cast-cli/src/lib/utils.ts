import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { homedir } from "os";
import { promisify } from "util";
import { ExecResult } from "./types";

const execp = promisify(exec);
const FOUNDRY_BIN = homedir() + "/.foundry/bin/cast";

export async function execCast(cmd: string, network: number, cancel?: AbortController): Promise<ExecResult> {
  try {
    return await execp(`${FOUNDRY_BIN} ${cmd}`, {
      signal: cancel?.signal,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        ETH_RPC_URL: getRpcUrl(network),
      },
    });
  } catch (err: any) {
    if (err?.code === 127) {
      throw new Error(`Cast executable not found at: ${FOUNDRY_BIN}`);
    }

    throw err;
  }
}

export function defaultOutputParser(stdout: string) {
  return stdout.replace("\n", "").trim();
}

export function defaultErrorParser(stderr: string, fullCommand?: string) {
  const initial = stderr.split(`Command failed: ${FOUNDRY_BIN}`)[1]?.replace("[31m", "").replace("[0m", "");

  if (!initial) {
    const secondary = stderr.replace("Error: \n", "")?.replace("[31m", "")?.replace("[0m", "");
    if (secondary) return secondary;
    return "An error occurred";
  }

  const clean = fullCommand ? initial.replace(fullCommand, "") : initial;
  if (clean) return clean;

  return initial;
}

const { AlchemyAPIKey } = getPreferenceValues<Preferences>();

export function getRpcUrl(network: number): string {
  switch (network) {
    case 137:
      return `https://polygon-mainnet.g.alchemy.com/v2/${AlchemyAPIKey}`;
    case 10:
      return `https://opt-mainnet.g.alchemy.com/v2/${AlchemyAPIKey}`;
    case 42161:
      return `https://arb-mainnet.g.alchemy.com/v2/${AlchemyAPIKey}`;

    default:
      return `https://eth-mainnet.g.alchemy.com/v2/${AlchemyAPIKey}`;
  }
}
