import { getPreferenceValues } from "@raycast/api";
import {
  get_caffeinate_state,
  list_processes,
  start_caffeinate,
  stop_caffeinate,
  stop_caffeinate_if_matches,
} from "rust:../rust";
import type { CaffeinationState } from "./caffeination";
import { parseCaffeinateTimeout } from "./duration";

interface ParsedCaffeinateArgs {
  durationSeconds: number | null;
  pid: number | null;
  windowHandle: number | null;
}

function parseArgs(additionalArgs?: string): ParsedCaffeinateArgs {
  const durationSeconds = parseCaffeinateTimeout(additionalArgs?.trim().split(/\s+/).filter(Boolean) ?? []);
  let pid: number | null = null;
  let windowHandle: number | null = null;

  if (additionalArgs) {
    const targetPid = /-w\s+(\d+)/.exec(additionalArgs);
    if (targetPid) pid = parseInt(targetPid[1], 10);

    const targetWindow = /-wh\s+(\d+)/.exec(additionalArgs);
    if (targetWindow) windowHandle = parseInt(targetWindow[1], 10);
  }

  return { durationSeconds, pid, windowHandle };
}

export async function windowsStartCaffeinate(additionalArgs?: string): Promise<string> {
  const { durationSeconds, pid, windowHandle } = parseArgs(additionalArgs);
  const preferences = getPreferenceValues<Preferences>();

  return await start_caffeinate({
    preventDisplay: preferences.preventDisplay,
    preventSystem: preferences.preventSystem,
    durationSeconds,
    pid,
    windowHandle,
  });
}

export async function windowsStopCaffeinate(): Promise<boolean> {
  return await stop_caffeinate();
}

export async function windowsStopCaffeinateIfMatches(expectedSessionId: string): Promise<boolean> {
  return await stop_caffeinate_if_matches(expectedSessionId);
}

export async function windowsGetCaffeinationState(): Promise<CaffeinationState> {
  const info = await get_caffeinate_state();
  return {
    isRunning: info.running,
    isManaged: info.running,
    sessionId: info.running ? (info.sessionId ?? null) : null,
    externalCount: null,
    totalSeconds: info.durationSeconds ?? null,
    startTime: info.startTime == null ? null : info.startTime * 1000,
  };
}

export async function windowsListProcesses(): Promise<WindowsProcessInfo[]> {
  return (await list_processes()).map((info) => ({ ...info, path: info.path ?? null }));
}

interface WindowsProcessInfo {
  name: string;
  pid: number;
  windowHandle: number;
  path: string | null;
}
