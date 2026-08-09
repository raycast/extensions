import { launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const PMSET_PATH = "/usr/bin/pmset";
const OSASCRIPT_PATH = "/usr/bin/osascript";
const SAVED_SETTINGS_KEY = "sleep-settings-before-activation";

type PowerSource = "battery" | "charger" | "ups";
type SleepSettings = Partial<Record<PowerSource, 0 | 1>>;

const powerSources: Record<string, PowerSource> = {
  "Battery Power:": "battery",
  "AC Power:": "charger",
  "UPS Power:": "ups",
};

const powerSourceFlags: Record<PowerSource, string> = {
  battery: "-b",
  charger: "-c",
  ups: "-u",
};

async function getSleepSettings(): Promise<SleepSettings> {
  const { stdout } = await execFileAsync(PMSET_PATH, ["-g", "custom"]);
  const settings: SleepSettings = {};
  let powerSource: PowerSource | undefined;

  for (const line of stdout.split("\n")) {
    const heading = line.trim();

    if (heading.endsWith(":")) {
      powerSource = powerSources[heading];
      if (powerSource) {
        settings[powerSource] = 0;
      }
      continue;
    }

    const match = line.match(/^\s*disablesleep\s+([01])\s*$/);
    if (powerSource && match) {
      settings[powerSource] = match[1] === "1" ? 1 : 0;
    }
  }

  if (Object.keys(settings).length === 0) {
    throw new Error("disablesleep settings not found");
  }

  return settings;
}

function parseSavedSettings(value: string): SleepSettings {
  const parsed: unknown = JSON.parse(value);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid saved sleep settings");
  }

  const settings: SleepSettings = {};
  for (const powerSource of Object.values(powerSources)) {
    const setting = (parsed as Record<string, unknown>)[powerSource];
    if (setting === 0 || setting === 1) {
      settings[powerSource] = setting;
    }
  }

  if (Object.keys(settings).length === 0) {
    throw new Error("Invalid saved sleep settings");
  }

  return settings;
}

async function runPrivilegedPmset(command: string): Promise<void> {
  await execFileAsync(OSASCRIPT_PATH, ["-e", `do shell script "${command}" with administrator privileges`]);
}

export async function isSleepDisabled(): Promise<boolean> {
  const { stdout } = await execFileAsync(PMSET_PATH, ["-g"]);
  const match = stdout.match(/^\s*SleepDisabled\s+([01])\s*$/m);

  if (!match) {
    throw new Error("SleepDisabled status not found");
  }

  return match[1] === "1";
}

export async function setSleepDisabled(disabled: boolean): Promise<void> {
  if (disabled) {
    const savedSettings = await LocalStorage.getItem<string>(SAVED_SETTINGS_KEY);
    const shouldSaveSettings = savedSettings === undefined;

    if (shouldSaveSettings) {
      await LocalStorage.setItem(SAVED_SETTINGS_KEY, JSON.stringify(await getSleepSettings()));
    }

    try {
      await runPrivilegedPmset(`${PMSET_PATH} -a disablesleep 1`);
    } catch (error) {
      if (shouldSaveSettings) {
        await LocalStorage.removeItem(SAVED_SETTINGS_KEY);
      }
      throw error;
    }

    return;
  }

  const savedSettings = await LocalStorage.getItem<string>(SAVED_SETTINGS_KEY);
  if (savedSettings === undefined) {
    return;
  }

  const settings = parseSavedSettings(savedSettings);
  const command = Object.entries(settings)
    .map(
      ([powerSource, value]) => `${PMSET_PATH} ${powerSourceFlags[powerSource as PowerSource]} disablesleep ${value}`,
    )
    .join(" && ");

  await runPrivilegedPmset(command);
  await LocalStorage.removeItem(SAVED_SETTINGS_KEY);
}

export async function refreshSleepStatusCommand(): Promise<void> {
  await launchCommand({ name: "check-sleep-status", type: LaunchType.Background });
}

export async function refreshMenuBarCommand(): Promise<void> {
  await launchCommand({ name: "menu-bar", type: LaunchType.Background });
}
