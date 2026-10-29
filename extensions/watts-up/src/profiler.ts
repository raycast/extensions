import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface BatteryCondition {
  /** Apple's health verdict, e.g. "Good" */
  condition?: string;
  /** Apple's reported maximum capacity, e.g. 82 */
  maxCapacityPercent?: number;
  /** e.g. "Yes" / "No" — only reported on some systems */
  optimizedCharging?: string;
  serialNumber?: string;
}

export interface ChargerIdentity {
  name?: string;
  manufacturer?: string;
  serialNumber?: string;
  watts?: number;
  /** Apple bricks report name/manufacturer/serial; third-party PD chargers usually don't */
  isIdentified: boolean;
}

export interface PowerProfile {
  battery: BatteryCondition;
  charger?: ChargerIdentity;
}

export interface ThermalState {
  /** 0-100; below 100 means the CPU is being throttled. Undefined = no throttling recorded. */
  cpuSpeedLimit?: number;
  throttled: boolean;
}

export async function getPowerProfile(): Promise<PowerProfile> {
  const { stdout } = await execAsync(
    "/usr/sbin/system_profiler SPPowerDataType -json",
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const items: Record<string, unknown>[] =
    JSON.parse(stdout).SPPowerDataType ?? [];

  const find = (name: string) => items.find((i) => i._name === name);

  const batteryInfo = find("spbattery_information") as
    | {
        sppower_battery_health_info?: {
          sppower_battery_health?: string;
          sppower_battery_health_maximum_capacity?: string;
        };
        sppower_battery_charge_info?: {
          sppower_battery_optimized_charging_engaged?: string;
        };
        sppower_battery_model_info?: { sppower_battery_serial_number?: string };
      }
    | undefined;

  const chargerInfo = find("sppower_ac_charger_information") as
    | {
        sppower_ac_charger_name?: string;
        sppower_ac_charger_manufacturer?: string;
        sppower_ac_charger_serial_number?: string;
        sppower_ac_charger_watts?: string;
        sppower_battery_charger_connected?: string;
      }
    | undefined;

  const maxCapacity =
    batteryInfo?.sppower_battery_health_info
      ?.sppower_battery_health_maximum_capacity;

  const battery: BatteryCondition = {
    condition: batteryInfo?.sppower_battery_health_info?.sppower_battery_health,
    maxCapacityPercent: maxCapacity
      ? Number(maxCapacity.replace("%", ""))
      : undefined,
    optimizedCharging:
      batteryInfo?.sppower_battery_charge_info
        ?.sppower_battery_optimized_charging_engaged,
    serialNumber:
      batteryInfo?.sppower_battery_model_info?.sppower_battery_serial_number,
  };

  const charger: ChargerIdentity | undefined =
    chargerInfo?.sppower_battery_charger_connected === "TRUE"
      ? {
          name: chargerInfo.sppower_ac_charger_name,
          manufacturer: chargerInfo.sppower_ac_charger_manufacturer,
          serialNumber: chargerInfo.sppower_ac_charger_serial_number,
          watts: chargerInfo.sppower_ac_charger_watts
            ? Number(chargerInfo.sppower_ac_charger_watts)
            : undefined,
          isIdentified: Boolean(
            chargerInfo.sppower_ac_charger_name ||
            chargerInfo.sppower_ac_charger_manufacturer,
          ),
        }
      : undefined;

  return { battery, charger };
}

export async function getThermalState(): Promise<ThermalState> {
  const { stdout } = await execAsync("/usr/bin/pmset -g therm");
  const limit = stdout.match(/CPU_Speed_Limit\s*=?\s*(\d+)/)?.[1];
  const cpuSpeedLimit = limit !== undefined ? Number(limit) : undefined;
  return {
    cpuSpeedLimit,
    throttled: cpuSpeedLimit !== undefined && cpuSpeedLimit < 100,
  };
}
