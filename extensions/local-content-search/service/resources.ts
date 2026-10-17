import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Config } from "./protocol";

// Model resource decisions independently of OS command formatting so old/new macOS power modes behave alike.
export enum ResourceBlock {
  LowPower = "waiting: Low Power Mode",
  Charger = "waiting: charger",
  Memory = "waiting: memory pressure",
  Unavailable = "waiting: resource checks unavailable",
}
interface ResourceReport {
  lowPowerMode: boolean;
  battery: string;
  memory: string;
}
const MIN_FREE_PERCENT = 10;
const CHECK_TIMEOUT_MS = 2000;
const exec = promisify(execFile);

// Keep OS commands and their text parsing below the controller's domain-level resource decisions.
export async function readResourceBlock(
  engine: string,
  policy: Config["powerMode"],
): Promise<ResourceBlock | undefined> {
  const [settings, battery, pressure] = await Promise.all([
    exec(engine, ["resources"], { timeout: CHECK_TIMEOUT_MS }),
    exec("/usr/bin/pmset", ["-g", "batt"], { timeout: CHECK_TIMEOUT_MS }),
    exec("/usr/bin/memory_pressure", ["-Q"], { timeout: CHECK_TIMEOUT_MS }),
  ]);
  const lowPowerMode = JSON.parse(settings.stdout).lowPowerMode;
  if (typeof lowPowerMode !== "boolean") {
    throw new Error("Invalid native power report");
  }
  return resourceBlock(
    { lowPowerMode, battery: battery.stdout, memory: pressure.stdout },
    policy,
  );
}

export function resourceBlock(
  report: ResourceReport,
  policy: Config["powerMode"],
): ResourceBlock | undefined {
  const free = report.memory.match(/free percentage:\s*(\d+)%/i)?.[1];
  if (free === undefined) {
    return ResourceBlock.Unavailable;
  }
  // Memory pressure takes precedence because it also blocks user-initiated inference.
  if (Number(free) < MIN_FREE_PERCENT) {
    return ResourceBlock.Memory;
  }
  if (report.lowPowerMode) {
    return ResourceBlock.LowPower;
  }
  if (policy === "ac-only" && !report.battery.includes("AC Power")) {
    return ResourceBlock.Charger;
  }
  return undefined;
}
