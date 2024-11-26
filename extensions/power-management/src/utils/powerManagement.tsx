import { execSync } from "child_process";
import { runWithPrivileges } from "./sudoSupport";

interface PowerModeDetail {
  battery: boolean;
  ac: boolean;
}

export enum PowerMode {
  Normal = "0",
  Low = "1",
  // High = "2",
}

export enum PowerModeTarget {
  All = "a",
  Battery = "b",
  AC = "c",
}

function parsePowerSettings(output: string, key: string): boolean {
  const start = output.search(new RegExp(`\\b${key} power:$`, "m"));

  if (start === -1) {
    throw new Error(`Could not find power settings for mode ${key}`);
  }

  const match = /powermode\s+(\d)$/m.exec(output.substring(start));

  if (!match || !match[1]) {
    throw new Error(`Could not parse power settings for mode ${key}`);
  }

  return match[1] === PowerMode.Low;
}

export function isLowPowerModeEnabled(): boolean {
  const stdout = execSync("pmset -g | grep powermode");
  const lowPowerModeValue = stdout.toString().trim().at(-1);

  return lowPowerModeValue === PowerMode.Low;
}

export async function setPowerMode(setting: PowerMode, target = PowerModeTarget.All): Promise<void> {
  // setting the value of `powermode` works just fine even on computers
  // where the key is `lowpowermode`
  await runWithPrivileges(`/usr/bin/pmset -${target} powermode ${setting}`);
}

export function getPowerModeDetails(): PowerModeDetail {
  const stdout = execSync("pmset -g custom").toString().toLowerCase();

  return {
    battery: parsePowerSettings(stdout, "battery"),
    ac: parsePowerSettings(stdout, "ac"),
  };
}

export async function toggleLowPowerMode(): Promise<boolean> {
  const lowPowerModeState = isLowPowerModeEnabled();

  await setPowerMode(lowPowerModeState ? PowerMode.Normal : PowerMode.Low);

  return !lowPowerModeState;
}
