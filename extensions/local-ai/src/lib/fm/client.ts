import { buildCountTokensArgs, buildRespondArgs, type RespondOptions } from "./args";
import { FALLBACK_MODELS, parseModels, parseTokenCount } from "./parse";
import { probeFm, runFm } from "./process";

export interface FmCallOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}

export async function respond(
  stdin: string,
  options: RespondOptions & FmCallOptions & { onText?: (accumulated: string) => void },
): Promise<string> {
  const { stdout } = await runFm(buildRespondArgs(options), {
    stdin,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    onStdout: options.onText,
  });
  return stdout;
}

export async function countTokens(
  stdin: string,
  options: FmCallOptions & { instructions?: string; imagePaths?: string[] },
): Promise<number> {
  const { stdout } = await runFm(buildCountTokensArgs(options), {
    stdin,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  });
  return parseTokenCount(stdout);
}

export async function fetchModels(timeoutMs: number): Promise<string[]> {
  const probe = await probeFm(["respond", "--help"], timeoutMs);
  if (probe.spawnErrorCode !== undefined || probe.exitCode !== 0) return [...FALLBACK_MODELS];
  return parseModels(`${probe.stdout}\n${probe.stderr}`);
}
