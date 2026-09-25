import { getPreferenceValues } from "@raycast/api";
import { is_caffeinate_running, list_processes, start_caffeinate, stop_caffeinate } from "rust:../rust";

interface ParsedCaffeinateArgs {
  durationSeconds: number | null;
  pid: number | null;
  windowHandle: number | null;
}

function parseArgs(additionalArgs?: string): ParsedCaffeinateArgs {
  let durationSeconds: number | null = null;
  let pid: number | null = null;
  let windowHandle: number | null = null;

  if (additionalArgs) {
    const duration = /-t\s+(\d+)/.exec(additionalArgs);
    if (duration) durationSeconds = parseInt(duration[1], 10);

    const targetPid = /-w\s+(\d+)/.exec(additionalArgs);
    if (targetPid) pid = parseInt(targetPid[1], 10);

    const targetWindow = /-wh\s+(\d+)/.exec(additionalArgs);
    if (targetWindow) windowHandle = parseInt(targetWindow[1], 10);
  }

  return { durationSeconds, pid, windowHandle };
}

export async function windowsStartCaffeinate(additionalArgs?: string): Promise<void> {
  const { durationSeconds, pid, windowHandle } = parseArgs(additionalArgs);
  const preferences = getPreferenceValues<Preferences>();

  await start_caffeinate({
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

export async function windowsIsCaffeinateRunning(): Promise<boolean> {
  const info = await is_caffeinate_running();
  return info.running;
}

export async function windowsListProcesses(): Promise<WindowsProcessInfo[]> {
  return await list_processes();
}

interface WindowsProcessInfo {
  name: string;
  pid: number;
  windowHandle: number;
  path: string | null;
}
