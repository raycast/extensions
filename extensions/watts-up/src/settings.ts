import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/** pmset flag for a single power source profile */
export type PowerSourceFlag = "-b" | "-c" | "-u";

export interface EnergySettings {
  /**
   * The profile these values were read from. Pass it back to
   * `setPmsetSetting` so a write lands on the same profile that was displayed,
   * even if the Mac has switched power source in the meantime.
   */
  sourceFlag: PowerSourceFlag;
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

/** pmset flag for the power source currently in use */
async function getActiveSourceFlag(): Promise<PowerSourceFlag> {
  const { source } = await getBatteryStatus();
  if (source === "Battery Power") return "-b";
  if (source === "UPS Power") return "-u";
  return "-c";
}

/**
 * The block of `pmset -g custom` belonging to one profile. Falls back to the
 * whole output if the header is missing (e.g. a Mac with a single profile).
 */
function profileBlock(stdout: string, flag: PowerSourceFlag): string {
  const header =
    flag === "-b" ? "Battery Power" : flag === "-u" ? "UPS Power" : "AC Power";
  const block = stdout.match(new RegExp(`^${header}:\\n((?: .*\\n?)*)`, "m"));
  return block?.[1] ?? stdout;
}

export async function getEnergySettings(): Promise<EnergySettings> {
  // Read the configured values for one named profile rather than `pmset -g`,
  // which only reports whichever profile is active at that instant.
  const sourceFlag = await getActiveSourceFlag();
  const { stdout } = await execAsync("/usr/bin/pmset -g custom");
  const block = profileBlock(stdout, sourceFlag);
  const num = (key: string) =>
    block.match(new RegExp(`^\\s*${key}\\s+(\\d+)`, "m"))?.[1];
  const lowPowerMode = num("lowpowermode");
  const powerNap = num("powernap");
  const displaySleep = num("displaysleep");
  const sleep = num("sleep");
  return {
    sourceFlag,
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
 * Change a pmset setting for one power source profile. `sourceFlag` comes from
 * the `EnergySettings` the value was read from, so the write cannot land on a
 * different profile than the one shown; `-a` would overwrite every profile.
 * Requires admin — macOS shows a password prompt via osascript. Only fixed,
 * known keys are passed in.
 */
export async function setPmsetSetting(
  key: "lowpowermode" | "powernap",
  value: 0 | 1,
  sourceFlag: PowerSourceFlag,
): Promise<void> {
  await execAsync(
    `/usr/bin/osascript -e 'do shell script "/usr/bin/pmset ${sourceFlag} ${key} ${value}" with administrator privileges'`,
  );
}
