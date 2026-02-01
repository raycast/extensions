/**
 * Yandex Smart Home API client.
 * Docs: https://yandex.ru/dev/dialogs/smart-home/doc/ru/concepts/platform-protocol
 */

const API_BASE = "https://api.iot.yandex.net";

export interface CapabilityState {
  instance: string;
  value: string | number | boolean;
}

export interface DeviceCapabilityObject {
  type: string;
  reportable: boolean;
  retrievable: boolean;
  parameters?: Record<string, unknown>;
  state: CapabilityState | null;
  last_updated?: number;
}

/** Device property (sensor): float, event, etc. State is current value. */
export interface DevicePropertyObject {
  type: string;
  retrievable?: boolean;
  reportable?: boolean;
  parameters?: { instance?: string; unit?: string; [k: string]: unknown };
  state?: { instance: string; value: number | string | boolean };
}

export interface DeviceObject {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  external_id?: string;
  skill_id?: string;
  household_id?: string;
  room: string | null;
  groups: string[];
  capabilities: DeviceCapabilityObject[];
  properties: DevicePropertyObject[];
}

export interface RoomObject {
  id: string;
  name: string;
  household_id?: string;
  devices: string[];
}

export interface ScenarioObject {
  id: string;
  name: string;
  is_active: boolean;
}

export interface UserInfo {
  status: string;
  request_id: string;
  rooms: RoomObject[];
  groups: unknown[];
  devices: DeviceObject[];
  scenarios: ScenarioObject[];
  households: { id: string; name: string }[];
}

export interface DeviceActionState {
  instance: string;
  value: string | number | boolean | Record<string, unknown>;
}

export interface DeviceAction {
  type: string;
  state: DeviceActionState;
}

export interface DeviceActionRequest {
  id: string;
  actions: DeviceAction[];
}

async function fetchApi<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  const data = (await response.json()) as T & {
    status?: string;
    message?: string;
  };
  if (
    response.status !== 200 ||
    (data as { status?: string }).status === "error"
  ) {
    const msg = (data as { message?: string }).message ?? response.statusText;
    throw new Error(msg);
  }

  return data;
}

export async function getUserInfo(accessToken: string): Promise<UserInfo> {
  return fetchApi<UserInfo>(accessToken, "/v1.0/user/info");
}

export async function deviceAction(
  accessToken: string,
  devices: DeviceActionRequest[],
): Promise<{ status: string; request_id: string; devices: unknown[] }> {
  return fetchApi(accessToken, "/v1.0/devices/actions", {
    method: "POST",
    body: JSON.stringify({ devices }),
  });
}

export async function scenarioAction(
  accessToken: string,
  scenarioId: string,
): Promise<{ status: string; request_id: string }> {
  const path = `/v1.0/scenarios/${encodeURIComponent(scenarioId)}/actions`;
  return fetchApi(accessToken, path, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function hasOnOffCapability(device: DeviceObject): boolean {
  return device.capabilities.some(
    (c) => c.type === "devices.capabilities.on_off",
  );
}

export function getOnOffState(device: DeviceObject): boolean | null {
  const cap = device.capabilities.find(
    (c) => c.type === "devices.capabilities.on_off",
  );
  if (!cap?.state?.value) return null;
  return cap.state.value === true;
}

export function hasBrightnessCapability(device: DeviceObject): boolean {
  return device.capabilities.some(
    (c) =>
      c.type === "devices.capabilities.range" &&
      c.parameters?.instance === "brightness",
  );
}

export function getBrightnessState(device: DeviceObject): number | null {
  const cap = device.capabilities.find(
    (c) =>
      c.type === "devices.capabilities.range" &&
      c.parameters?.instance === "brightness",
  );
  if (!cap?.state?.value) return null;
  return typeof cap.state.value === "number" ? cap.state.value : null;
}

/** Range parameters from device capability (see range-instance). Defaults: min 0, max 100, precision 10. */
export function getBrightnessRange(device: DeviceObject): {
  min: number;
  max: number;
  precision: number;
} {
  const cap = device.capabilities.find(
    (c) =>
      c.type === "devices.capabilities.range" &&
      c.parameters?.instance === "brightness",
  );
  const range = cap?.parameters?.range as
    | { min?: number; max?: number; precision?: number }
    | undefined;
  const min = typeof range?.min === "number" ? range.min : 0;
  const max = typeof range?.max === "number" ? range.max : 100;
  const precision =
    typeof range?.precision === "number" && range.precision > 0
      ? range.precision
      : 10;
  return { min, max, precision };
}

// ——— device properties (sensors): float, etc. ———
// https://yandex.ru/dev/dialogs/smart-home/doc/ru/concepts/float

/** Property instances (float) to short label. */
export const PROPERTY_INSTANCE_LABELS: Record<string, string> = {
  temperature: "Temp",
  humidity: "Humidity",
  battery_level: "Battery",
  illumination: "Light",
  pressure: "Pressure",
  co2_level: "CO₂",
  pm1_density: "PM1",
  pm2_5_density: "PM2.5",
  pm10_density: "PM10",
  tvoc: "TVOC",
  power: "Power",
  voltage: "Voltage",
  amperage: "Amperage",
  water_level: "Water",
  food_level: "Food",
  electricity_meter: "Electricity",
  gas_meter: "Gas",
  water_meter: "Water meter",
  heat_meter: "Heat",
  meter: "Meter",
};

/** Round number to 2 decimal places for display. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Format property value + unit for display. */
export function formatPropertyValue(
  instance: string,
  value: number | string | boolean,
  unit?: string,
): string {
  if (typeof value !== "number") return String(value);
  const v = round2(value);
  switch (unit) {
    case "unit.temperature.celsius":
      return `${v}°C`;
    case "unit.temperature.kelvin":
      return `${v} K`;
    case "unit.percent":
      return `${v}%`;
    case "unit.illumination.lux":
      return `${v} lx`;
    case "unit.pressure.mmhg":
      return `${v} mmHg`;
    case "unit.pressure.pascal":
      return `${v} Pa`;
    case "unit.watt":
      return `${v} W`;
    case "unit.volt":
      return `${v} V`;
    case "unit.ampere":
      return `${v} A`;
    case "unit.ppm":
      return `${v} ppm`;
    case "unit.density.mcg_m3":
      return `${v} µg/m³`;
    default:
      return String(v);
  }
}

/** Properties that have state (sensor values) for display. */
export function getDevicePropertyStates(device: DeviceObject): {
  instance: string;
  value: number | string | boolean;
  unit?: string;
  label: string;
}[] {
  const out: {
    instance: string;
    value: number | string | boolean;
    unit?: string;
    label: string;
  }[] = [];
  for (const prop of device.properties ?? []) {
    const state = prop.state;
    if (!state || state.value == null) continue;
    const instance = state.instance ?? (prop.parameters?.instance as string);
    if (!instance) continue;
    const unit = prop.parameters?.unit as string | undefined;
    const label = PROPERTY_INSTANCE_LABELS[instance] ?? instance;
    out.push({
      instance,
      value: state.value,
      unit,
      label: `${label}: ${formatPropertyValue(instance, state.value, unit)}`,
    });
  }
  return out;
}

/** Build list of values from min to max by precision (e.g. 0, 10, 20, ..., 100). */
export function rangeSteps(
  min: number,
  max: number,
  precision: number,
): number[] {
  const steps: number[] = [];
  for (let v = min; v <= max; v += precision) {
    steps.push(round2(v));
  }
  return steps;
}

// ——— color_setting (https://yandex.ru/dev/dialogs/smart-home/doc/ru/concepts/color_setting) ———

export function hasColorSettingCapability(device: DeviceObject): boolean {
  return device.capabilities.some(
    (c) => c.type === "devices.capabilities.color_setting",
  );
}

function getColorSettingCap(
  device: DeviceObject,
): DeviceCapabilityObject | undefined {
  return device.capabilities.find(
    (c) => c.type === "devices.capabilities.color_setting",
  );
}

/** Temperature range from parameters.temperature_k. Default 2000–9000 K. */
export function getTemperatureKRange(device: DeviceObject): {
  min: number;
  max: number;
} {
  const cap = getColorSettingCap(device);
  const tk = cap?.parameters?.temperature_k as
    | { min?: number; max?: number }
    | undefined;
  const min = typeof tk?.min === "number" ? tk.min : 2000;
  const max = typeof tk?.max === "number" ? tk.max : 9000;
  return { min, max };
}

/** Scene ids from parameters.color_scene.scenes. */
export function getColorScenes(device: DeviceObject): { id: string }[] {
  const cap = getColorSettingCap(device);
  const scenes = (
    cap?.parameters?.color_scene as { scenes?: { id: string }[] } | undefined
  )?.scenes;
  return Array.isArray(scenes) ? scenes : [];
}

/** Current color_setting state: instance (temperature_k | scene | hsv | rgb) and value. */
export function getColorSettingState(
  device: DeviceObject,
): { instance: string; value: unknown } | null {
  const cap = getColorSettingCap(device);
  if (!cap?.state) return null;
  const s = cap.state as { instance?: string; value?: unknown };
  if (!s.instance) return null;
  return { instance: s.instance, value: s.value };
}

/** Supports temperature_k (white temperature). */
export function hasTemperatureK(device: DeviceObject): boolean {
  const cap = getColorSettingCap(device);
  return cap?.parameters?.temperature_k != null;
}

/** Supports color_scene (preset scenes). */
export function hasColorScene(device: DeviceObject): boolean {
  const scenes = getColorScenes(device);
  return scenes.length > 0;
}

/** Preset labels for temperature_k (from Yandex docs). */
export const TEMPERATURE_K_PRESETS: { value: number; label: string }[] = [
  { value: 1500, label: "Fire white" },
  { value: 2700, label: "Soft white" },
  { value: 3400, label: "Warm white" },
  { value: 4500, label: "White" },
  { value: 5600, label: "Day white" },
  { value: 6500, label: "Cold white" },
  { value: 7500, label: "Fog white" },
  { value: 9000, label: "Sky white" },
];

/** Scene id to display name. */
export const COLOR_SCENE_NAMES: Record<string, string> = {
  alarm: "Alarm",
  alice: "Alice",
  candle: "Candle",
  dinner: "Dinner",
  fantasy: "Fantasy",
  garland: "Garland",
  jungle: "Jungle",
  movie: "Movie",
  neon: "Neon",
  night: "Night",
  ocean: "Ocean",
  party: "Party",
  reading: "Reading",
  rest: "Rest",
  romance: "Romance",
  siren: "Siren",
};

/** Device supports color_model hsv or rgb (arbitrary color). */
export function hasColorModel(device: DeviceObject): boolean {
  const cap = getColorSettingCap(device);
  const model = cap?.parameters?.color_model as string | undefined;
  return model === "hsv" || model === "rgb";
}

export function getColorModel(device: DeviceObject): "hsv" | "rgb" | null {
  const cap = getColorSettingCap(device);
  const model = cap?.parameters?.color_model as string | undefined;
  if (model === "hsv") return "hsv";
  if (model === "rgb") return "rgb";
  return null;
}

/** Preset colors: name + HSV (h 0–360, s 0–100, v 0–100). */
export const PRESET_COLORS_HSV: {
  label: string;
  h: number;
  s: number;
  v: number;
}[] = [
  { label: "Red", h: 0, s: 100, v: 100 },
  { label: "Orange", h: 30, s: 100, v: 100 },
  { label: "Yellow", h: 60, s: 100, v: 100 },
  { label: "Lime", h: 90, s: 100, v: 100 },
  { label: "Green", h: 120, s: 100, v: 100 },
  { label: "Cyan", h: 180, s: 100, v: 100 },
  { label: "Blue", h: 240, s: 100, v: 100 },
  { label: "Purple", h: 270, s: 100, v: 100 },
  { label: "Pink", h: 330, s: 100, v: 100 },
  { label: "White", h: 0, s: 0, v: 100 },
];

/** Convert HSV to 24-bit RGB (0–16777215) for API. */
export function hsvToRgb24(h: number, s: number, v: number): number {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) | (G << 8) | B;
}
