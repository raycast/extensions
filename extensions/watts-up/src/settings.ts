import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface EnergySettings {
  lowPowerMode?: boolean;
  powerNap?: boolean;
  /** Minutes until display sleeps (0 = never) */
  displaySleepMin?: number;
  /** Minutes until system sleeps (0 = never) */
  sleepMin?: number;
}

export interface BatteryStatus {
  source: string;
  percent?: number;
  state?: string;
  timeRemaining?: string;
}

export interface SleepAssertion {
  pid: number;
  process: string;
  type: string;
  reason: string;
}

export async function getEnergySettings(): Promise<EnergySettings> {
  const { stdout } = await execAsync("/usr/bin/pmset -g");
  const num = (key: string) =>
    stdout.match(new RegExp(`^\\s*${key}\\s+(\\d+)`, "m"))?.[1];
  const lowPowerMode = num("lowpowermode");
  const powerNap = num("powernap");
  const displaySleep = num("displaysleep");
  const sleep = num("sleep");
  return {
    lowPowerMode: lowPowerMode !== undefined ? lowPowerMode === "1" : undefined,
    powerNap: powerNap !== undefined ? powerNap === "1" : undefined,
    displaySleepMin:
      displaySleep !== undefined ? Number(displaySleep) : undefined,
    sleepMin: sleep !== undefined ? Number(sleep) : undefined,
  };
}

export async function getBatteryStatus(): Promise<BatteryStatus> {
  const { stdout } = await execAsync("/usr/bin/pmset -g batt");
  const source = stdout.match(/drawing from '([^']+)'/)?.[1] ?? "Unknown";
  const battery = stdout.match(
    /(\d+)%;\s*([^;]+?);?\s*(?:(\d+:\d+) remaining)?\s*present/,
  );
  return {
    source,
    percent: battery ? Number(battery[1]) : undefined,
    state: battery?.[2]?.trim(),
    timeRemaining: battery?.[3] === "0:00" ? undefined : battery?.[3],
  };
}

/** Processes currently holding sleep-prevention assertions */
export async function getSleepAssertions(): Promise<SleepAssertion[]> {
  const { stdout } = await execAsync("/usr/bin/pmset -g assertions");
  const assertions: SleepAssertion[] = [];
  const re = /pid (\d+)\((.+?)\): \[[^\]]+\] [\d:]+ (\w+) named: "([^"]*)"/g;
  for (const m of stdout.matchAll(re)) {
    const type = m[3];
    if (
      type === "PreventUserIdleSystemSleep" ||
      type === "PreventSystemSleep" ||
      type === "PreventUserIdleDisplaySleep"
    ) {
      assertions.push({ pid: Number(m[1]), process: m[2], type, reason: m[4] });
    }
  }
  return assertions;
}

/**
 * Change a pmset setting for all power sources. Requires admin — macOS shows
 * a password prompt via osascript. Only fixed, known keys are passed in.
 */
export async function setPmsetSetting(
  key: "lowpowermode" | "powernap",
  value: 0 | 1,
): Promise<void> {
  await execAsync(
    `/usr/bin/osascript -e 'do shell script "/usr/bin/pmset -a ${key} ${value}" with administrator privileges'`,
  );
}
