import type { JsonObject, JsonPrimitive } from "../api/types";

export type DeviceCategory =
  "power-station" | "home-battery" | "solar" | "whole-home" | "power-kit" | "appliance" | "smart-plug" | "unknown";

export type DeviceFamily =
  | "power-ocean"
  | "powerstream"
  | "stream"
  | "delta-3-max-plus"
  | "delta-3-max"
  | "delta-pro"
  | "delta-pro-ultra"
  | "delta-pro-3"
  | "delta-2"
  | "delta-2-max"
  | "delta-max"
  | "delta-mini"
  | "river-2"
  | "river-2-max"
  | "river-2-pro"
  | "river-pro"
  | "smart-home-panel"
  | "smart-home-panel-2"
  | "power-kits"
  | "smart-plug"
  | "glacier"
  | "wave"
  | "unknown";

export interface DeviceProfile {
  family: DeviceFamily;
  displayName: string;
  category: DeviceCategory;
  prefixes: readonly string[];
  searchTerms: readonly string[];
  documentationUrl?: string;
}

export type QuotaMap = Record<string, JsonPrimitive>;

export type PowerFlowState = "charging" | "discharging" | "idle" | "full" | "unknown";

export type SupplyPriority = "power-supply-first" | "battery-charging-first";

export interface DeviceSnapshot {
  serialNumber: string;
  name: string;
  productName?: string;
  online: boolean;
  profile: DeviceProfile;
  batteryLevel?: number;
  inputWatts?: number;
  outputWatts?: number;
  solarWatts?: number;
  gridWatts?: number;
  loadWatts?: number;
  batteryWatts?: number;
  solarInput1Watts?: number;
  solarInput2Watts?: number;
  voltageVolts?: number;
  currentAmps?: number;
  frequencyHertz?: number;
  remainingMinutes?: number;
  temperatureCelsius?: number;
  leftTemperatureCelsius?: number;
  rightTemperatureCelsius?: number;
  leftTargetTemperatureCelsius?: number;
  rightTargetTemperatureCelsius?: number;
  acOutputEnabled?: boolean;
  dcOutputEnabled?: boolean;
  switchEnabled?: boolean;
  targetTemperatureCelsius?: number;
  chargeLimitPercent?: number;
  dischargeLimitPercent?: number;
  customLoadWatts?: number;
  supplyPriority?: SupplyPriority;
  indicatorBrightnessPercent?: number;
  operatingMode?: string;
  operatingSubmode?: string;
  fanSpeed?: string;
  lightStripMode?: string;
  ecoModeEnabled?: boolean;
  doorOpen?: boolean;
  partitionInstalled?: boolean;
  iceMakingState?: string;
  iceProgressPercent?: number;
  powerFlow: PowerFlowState;
  quotas: QuotaMap;
  quotaError?: string;
}

export interface DeviceCommandOption {
  title: string;
  value: number;
}

export interface DeviceCommandDefinition {
  id: string;
  title: string;
  description: string;
  kind: "toggle" | "number" | "select";
  valueLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly DeviceCommandOption[];
  buildPayload(value?: number, quotas?: QuotaMap): JsonObject;
}

export interface DeviceCommandRequest {
  serialNumber: string;
  commandId: string;
  value?: number;
}

export interface RawReading {
  key: string;
  value: JsonPrimitive;
  relevance: number;
}
