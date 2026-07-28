import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface AdapterInfo {
  /** Negotiated wattage, e.g. 85 */
  watts?: number;
  /** Negotiated current in mA, e.g. 4250 */
  currentMa?: number;
  /** Negotiated voltage in mV, e.g. 20000 */
  voltageMv?: number;
  /** Charger self-description, e.g. "pd charger" */
  description?: string;
  isWireless?: boolean;
}

export interface BatteryInfo {
  /** Percentage 0-100 */
  percent?: number;
  /** Battery voltage in mV */
  voltageMv?: number;
  /** Signed current in mA (negative = discharging) */
  amperageMa?: number;
  /** Degrees celsius */
  temperature?: number;
  cycleCount?: number;
  /** Current max capacity in mAh */
  rawMaxCapacity?: number;
  /** Factory design capacity in mAh */
  designCapacity?: number;
  /** Per-cell voltages in mV */
  cellVoltagesMv?: number[];
  /** Signed instantaneous current in mA (negative = discharging) */
  instantAmperageMa?: number;
}

export interface PowerInfo {
  connected: boolean;
  charging: boolean;
  fullyCharged: boolean;
  adapter: AdapterInfo;
  battery: BatteryInfo;
}

// ioreg prints 64-bit values unsigned; convert e.g. 18446744073709550892 back to -724
function toSigned64(value: string): number {
  const n = BigInt(value);
  const signed = n > 0x7fffffffffffffffn ? n - 0x10000000000000000n : n;
  return Number(signed);
}

function matchNumber(source: string, key: string): number | undefined {
  const m = source.match(new RegExp(`"${key}"\\s*=\\s*(\\d+)`));
  return m ? Number(m[1]) : undefined;
}

function matchBool(source: string, key: string): boolean {
  return new RegExp(`"${key}"\\s*=\\s*Yes`).test(source);
}

export function parseIoreg(output: string): PowerInfo {
  // AdapterDetails is a single-line dict: {"IsWireless"=No,"AdapterVoltage"=20000,"Watts"=85,...}
  const adapterLine =
    output.match(/"AdapterDetails"\s*=\s*(\{.*\})/)?.[1] ?? "";

  const adapter: AdapterInfo = {
    watts: matchNumber(adapterLine, "Watts"),
    currentMa: matchNumber(adapterLine, "Current"),
    voltageMv: matchNumber(adapterLine, "AdapterVoltage"),
    description: adapterLine.match(/"Description"\s*=\s*"([^"]*)"/)?.[1],
    isWireless: matchBool(adapterLine, "IsWireless"),
  };

  // Strip the AdapterDetails/BatteryData lines so their nested keys (Voltage,
  // CycleCount, ...) can't shadow the top-level battery keys
  const topLevel = output
    .split("\n")
    .filter(
      (line) =>
        !/"(AdapterDetails|AppleRawAdapterDetails|BatteryData|FedDetails|PowerTelemetryData)"/.test(
          line,
        ),
    )
    .join("\n");

  const amperageRaw = topLevel.match(/"Amperage"\s*=\s*(\d+)/)?.[1];
  const instantAmperageRaw = topLevel.match(
    /"InstantAmperage"\s*=\s*(\d+)/,
  )?.[1];
  const temperatureRaw = matchNumber(topLevel, "Temperature");
  // CellVoltage lives inside the BatteryData dict, so read it from the raw output
  const cellVoltages = output.match(/"CellVoltage"=\((\d+(?:,\d+)*)\)/)?.[1];

  const battery: BatteryInfo = {
    percent: matchNumber(topLevel, "CurrentCapacity"),
    voltageMv: matchNumber(topLevel, "Voltage"),
    amperageMa: amperageRaw !== undefined ? toSigned64(amperageRaw) : undefined,
    temperature:
      temperatureRaw !== undefined ? temperatureRaw / 100 : undefined,
    cycleCount: matchNumber(topLevel, "CycleCount"),
    rawMaxCapacity: matchNumber(topLevel, "AppleRawMaxCapacity"),
    designCapacity: matchNumber(topLevel, "DesignCapacity"),
    cellVoltagesMv: cellVoltages?.split(",").map(Number),
    instantAmperageMa:
      instantAmperageRaw !== undefined
        ? toSigned64(instantAmperageRaw)
        : undefined,
  };

  return {
    connected: matchBool(topLevel, "ExternalConnected"),
    charging: matchBool(topLevel, "IsCharging"),
    fullyCharged: matchBool(topLevel, "FullyCharged"),
    adapter,
    battery,
  };
}

export async function getPowerInfo(): Promise<PowerInfo> {
  const { stdout } = await execAsync("/usr/sbin/ioreg -rn AppleSmartBattery", {
    maxBuffer: 10 * 1024 * 1024,
  });
  return parseIoreg(stdout);
}

export function formatVolts(mv?: number): string | undefined {
  return mv !== undefined
    ? `${(mv / 1000).toFixed(2).replace(/\.?0+$/, "")} V`
    : undefined;
}

export function formatAmps(ma?: number): string | undefined {
  return ma !== undefined
    ? `${(ma / 1000).toFixed(2).replace(/\.?0+$/, "")} A`
    : undefined;
}

/** Power the battery is currently charging (+) or discharging (-) at, in watts */
export function batteryPowerWatts(battery: BatteryInfo): number | undefined {
  if (battery.voltageMv === undefined || battery.amperageMa === undefined)
    return undefined;
  return (battery.voltageMv / 1000) * (battery.amperageMa / 1000);
}
