import {
  ApiVersionInfo,
  InverterInfo,
  InverterInfoResponse,
  InverterRealtimeDataResponse,
  MeterRealtimeDataResponse,
  PowerFlowRealtimeDataResponse,
  RealtimeValueSeries,
  SiteData,
  StorageRealtimeDataResponse,
} from "./types";

export interface InverterItem {
  id: string;
  info: InverterInfo;
}

export interface MeterSnapshot {
  energyMinusWattHours: number | null;
  energyPlusWattHours: number | null;
  frequencyHertz: number | null;
  id: string;
  location: number | null;
  powerWatts: number | null;
  voltageAverageVolts: number | null;
}

export interface StorageSnapshot {
  currentAmps: number | null;
  designedCapacityWattHours: number | null;
  enabled: number | boolean | null;
  id: string;
  maximumCapacityWattHours: number | null;
  stateOfChargePercent: number | null;
  status: number | string | null;
  temperatureCelsius: number | null;
  voltageVolts: number | null;
}

export interface OhmpilotSnapshot {
  energyWattHours: number | null;
  id: string;
  powerWatts: number | null;
  state: number | string | null;
  temperatureCelsius: number | null;
}

export interface FroniusSnapshot {
  apiVersion: ApiVersionInfo | null;
  errorCount: number;
  inverters: InverterItem[];
  meters: MeterSnapshot[];
  ohmpilotEnergy: number | null;
  ohmpilots: OhmpilotSnapshot[];
  powerFlowVersion: string | null;
  site: SiteData;
  storages: StorageSnapshot[];
  timestamp: string;
  warnings: string[];
}

export interface SnapshotSources {
  apiVersion?: ApiVersionInfo | undefined;
  inverterRealtime?: InverterRealtimeDataResponse | undefined;
  inverterResponse: InverterInfoResponse;
  meterRealtime?: MeterRealtimeDataResponse | undefined;
  powerResponse: PowerFlowRealtimeDataResponse;
  storageRealtime?: StorageRealtimeDataResponse | undefined;
  warnings?: string[] | undefined;
}

export function hasInverterError(inverter: InverterInfo): boolean {
  return inverter.ErrorCode !== 0 && inverter.ErrorCode !== -1;
}

function decodeInverterName(value: string): string {
  let decoded = value;
  for (let pass = 0; pass < 2; pass++) {
    const next = decoded
      .replace(/&#(\d+);/g, (match, codePoint: string) => {
        const number = Number.parseInt(codePoint, 10);
        return Number.isInteger(number) && number >= 0 && number <= 0x10ffff ? String.fromCodePoint(number) : match;
      })
      .replace(/&#x([\da-f]+);/gi, (match, codePoint: string) => {
        const number = Number.parseInt(codePoint, 16);
        return Number.isInteger(number) && number >= 0 && number <= 0x10ffff ? String.fromCodePoint(number) : match;
      })
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&");
    if (next === decoded) break;
    decoded = next;
  }
  return decoded.trim();
}

export function inverterDisplayName(inverter: InverterItem): string {
  return inverter.info.CustomName || `Inverter ${inverter.id}`;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function allNumbers(values: Array<number | null>): values is number[] {
  return values.every((value) => value !== null);
}

function sumSeries(series: RealtimeValueSeries | undefined): number | null {
  if (!series) return null;
  const values = Object.values(series.Values).filter((value): value is number => finiteOrNull(value) !== null);
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
}

function average(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => finiteOrNull(value) !== null);
  return numbers.length > 0 ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
}

export function createSnapshot({
  apiVersion,
  inverterRealtime,
  inverterResponse,
  meterRealtime,
  powerResponse,
  storageRealtime,
  warnings = [],
}: SnapshotSources): FroniusSnapshot {
  const inverters = Object.entries(inverterResponse.Body.Data).map(([id, info]) => ({
    id,
    info: { ...info, CustomName: decodeInverterName(info.CustomName) },
  }));
  const meters = Object.entries(meterRealtime?.Body.Data ?? {}).map(([id, meter]) => ({
    energyMinusWattHours: finiteOrNull(meter.EnergyReal_WAC_Minus_Absolute),
    energyPlusWattHours: finiteOrNull(meter.EnergyReal_WAC_Plus_Absolute),
    frequencyHertz: finiteOrNull(meter.Frequency_Phase_Average),
    id,
    location: finiteOrNull(meter.Meter_Location_Current),
    powerWatts: finiteOrNull(meter.PowerReal_P_Sum),
    voltageAverageVolts: average([meter.Voltage_AC_Phase_1, meter.Voltage_AC_Phase_2, meter.Voltage_AC_Phase_3]),
  }));
  const storages = Object.entries(storageRealtime?.Body.Data ?? {}).map(([id, storage]) => {
    const controller = storage.Controller;
    return {
      currentAmps: finiteOrNull(controller?.Current_DC),
      designedCapacityWattHours: finiteOrNull(controller?.DesignedCapacity),
      enabled: controller?.Enable ?? null,
      id,
      maximumCapacityWattHours: finiteOrNull(controller?.Capacity_Maximum),
      stateOfChargePercent: finiteOrNull(controller?.StateOfCharge_Relative),
      status: controller?.Status_BatteryCell ?? null,
      temperatureCelsius: finiteOrNull(controller?.Temperature_Cell),
      voltageVolts: finiteOrNull(controller?.Voltage_DC),
    };
  });
  const legacyOhmpilotEntries = Object.entries(powerResponse.Body.Data.Ohmpilots ?? {});
  const smartloadOhmpilotEntries = Object.entries(powerResponse.Body.Data.Smartloads?.Ohmpilots ?? {});
  const ohmpilots: OhmpilotSnapshot[] =
    smartloadOhmpilotEntries.length > 0
      ? smartloadOhmpilotEntries.map(([id, ohmpilot]) => ({
          energyWattHours: null,
          id,
          powerWatts: finiteOrNull(ohmpilot.P_AC_Total),
          state: ohmpilot.State ?? null,
          temperatureCelsius: finiteOrNull(ohmpilot.Temperature),
        }))
      : legacyOhmpilotEntries.map(([id, ohmpilot]) => ({
          energyWattHours: finiteOrNull(ohmpilot.EnergyReal_WAC_Sum_Consumed),
          id,
          powerWatts: finiteOrNull(ohmpilot.PowerReal_PAC_Sum),
          state: finiteOrNull(ohmpilot.CodeOfState),
          temperatureCelsius: finiteOrNull(ohmpilot.Temperature_Channel_1),
        }));
  const legacyOhmpilotEnergies = legacyOhmpilotEntries.map(([, ohmpilot]) =>
    finiteOrNull(ohmpilot.EnergyReal_WAC_Sum_Consumed),
  );
  const legacyOhmpilotEnergy =
    legacyOhmpilotEnergies.length > 0 && allNumbers(legacyOhmpilotEnergies)
      ? legacyOhmpilotEnergies.reduce((sum, energy) => sum + energy, 0)
      : null;
  const storageStateOfCharge = storages.find((storage) => storage.stateOfChargePercent !== null)?.stateOfChargePercent;
  const originalSite = powerResponse.Body.Data.Site;
  const site: SiteData = {
    ...originalSite,
    E_Day: sumSeries(inverterRealtime?.Body.Data.DAY_ENERGY) ?? originalSite.E_Day ?? null,
    E_Total: sumSeries(inverterRealtime?.Body.Data.TOTAL_ENERGY) ?? originalSite.E_Total,
    E_Year: sumSeries(inverterRealtime?.Body.Data.YEAR_ENERGY) ?? originalSite.E_Year ?? null,
    StateOfCharge_Relative: originalSite.StateOfCharge_Relative ?? storageStateOfCharge ?? null,
  };

  return {
    apiVersion: apiVersion ?? null,
    errorCount: inverters.filter(({ info }) => hasInverterError(info)).length,
    inverters,
    meters,
    ohmpilotEnergy:
      legacyOhmpilotEntries.length > 0
        ? legacyOhmpilotEnergy
        : ohmpilots.some((ohmpilot) => ohmpilot.energyWattHours !== null)
          ? ohmpilots.reduce((sum, ohmpilot) => sum + (ohmpilot.energyWattHours ?? 0), 0)
          : null,
    ohmpilots,
    powerFlowVersion: powerResponse.Body.Data.Version ?? null,
    site,
    storages,
    timestamp: powerResponse.Head.Timestamp || inverterResponse.Head.Timestamp,
    warnings,
  };
}
