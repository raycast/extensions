/**
 * AppleScript runner and helpers for the Pinwork bridge.
 */

import { runAppleScript } from "@raycast/utils";

const DEFAULT_TIMEOUT_MS = 10_000;

export interface PinworkScriptOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function runPinworkScript(
  script: string,
  options: PinworkScriptOptions = {},
): Promise<string> {
  const output = await runAppleScript(script, {
    humanReadableOutput: false,
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    signal: options.signal,
  });
  return normalizeAppleScriptString(output);
}

function normalizeAppleScriptString(output: string): string {
  const trimmed = output.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }

  return trimmed;
}

export function escapeAppleScriptString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}
