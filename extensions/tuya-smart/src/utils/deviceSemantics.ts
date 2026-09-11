import { Device, FunctionItem } from "./interfaces";
import { isSwitchStatus } from "./filters";
import { parseEnumOptions } from "./lightFunctions";
import { temperatureUnitPreference } from "./preferences";

export type DeviceKind = "control" | "sensor" | "lock";

/** Data points that carry encoded blobs or internal bookkeeping, never shown to a user. */
const NOISE_CODES = new Set([
  "unlock_method_create",
  "unlock_method_delete",
  "unlock_method_modify",
  "lock_record",
  "synch_method",
  "remote_no_dp_key",
  "record",
  "check_code_set",
  "ble_unlock_check",
  "remote_pd_setkey_check",
  "temporary_password_creat",
  "password",
  "rtc_lock",
]);

const LOCK_INDICATORS = ["alarm_lock", "lock_motor_state", "manual_lock", "unlock_fingerprint", "reverse_lock"];
const LOCK_CATEGORIES = new Set([
  "ms",
  "jtmspro",
  "videolock",
  "photolock",
  "bxx",
  "gyms",
  "hotelms",
  "mk",
  "small_lock",
]);

const BATTERY_CODES = ["battery_percentage", "residual_electricity", "battery_percentage_1"];

/** Replaces one data point without mutating the device held in state. */
export function withUpdatedStatus(device: Device, command: FunctionItem): Device {
  return {
    ...device,
    status: (device.status ?? []).map((status) => (status.code === command.code ? command : status)),
  };
}

/**
 * A command that failed must not leave its requested value behind. The device list is
 * persisted, so writing an unapplied value means the UI keeps showing, across relaunches,
 * a state the physical device never reached.
 */
export function applyCommandResult(device: Device, outcome: { result: boolean; command: FunctionItem }): Device {
  return outcome.result ? withUpdatedStatus(device, outcome.command) : device;
}

export function isNoiseStatus(status: FunctionItem): boolean {
  if (NOISE_CODES.has(status.code)) return true;
  // Countdown timers sit at zero on every socket; they are only meaningful when running.
  if (/^countdown(_\d+)?$/.test(status.code) && status.value === 0) return true;
  // Base64-ish payloads are never human readable, whatever their code.
  return typeof status.value === "string" && /^[A-Za-z0-9+/]{12,}={0,2}$/.test(status.value);
}

export function classifyDevice(device: Device): DeviceKind {
  const status = device.status ?? [];
  if (status.some(isSwitchStatus)) return "control";

  const category = String(device.category ?? "").toLowerCase();
  const looksLikeLock =
    LOCK_CATEGORIES.has(category) ||
    category.includes("lock") ||
    status.some((item) => LOCK_INDICATORS.includes(item.code));

  return looksLikeLock ? "lock" : "sensor";
}

export function batteryOf(device: Device): number | undefined {
  for (const code of BATTERY_CODES) {
    const hit = (device.status ?? []).find((status) => status.code === code);
    if (hit && typeof hit.value === "number" && hit.value > 0) return hit.value;
  }
  const state = (device.status ?? []).find((status) => status.code === "battery_state");
  if (state?.value === "high") return 100;
  if (state?.value === "middle") return 50;
  if (state?.value === "low") return 10;
  return undefined;
}

const ALARM_LABELS: Record<string, string> = {
  low_battery: "Low battery",
  wrong_finger: "Wrong fingerprint",
  wrong_password: "Wrong password",
  wrong_card: "Wrong card",
  hijack: "Duress alarm",
  doorbell: "Doorbell pressed",
  door_unclosed: "Door not closed",
  sos: "SOS",
};

/**
 * Only ongoing conditions earn a badge. `alarm_lock` also reports one-off events such as
 * a mistyped code, and flagging those forever would be exactly the noise this removes.
 */
const PERSISTENT_ALARMS = new Set(["low_battery", "door_unclosed", "sos"]);

export const LOW_BATTERY_THRESHOLD = 20;

/** Conditions worth putting in front of the user rather than burying in a list. */
export function alarmsOf(device: Device): string[] {
  const alarms: string[] = [];
  for (const status of device.status ?? []) {
    if (status.code === "alarm_lock" && typeof status.value === "string" && PERSISTENT_ALARMS.has(status.value)) {
      alarms.push(ALARM_LABELS[status.value] ?? status.value);
    }
    if (status.code === "hijack" && status.value === true) alarms.push(ALARM_LABELS.hijack);
  }
  const battery = batteryOf(device);

  // `alarm_lock` keeps the last alarm, not the current state. A healthy battery reading
  // contradicts a stale low-battery alarm, so trust the reading.
  const stale = battery !== undefined && battery > LOW_BATTERY_THRESHOLD;
  const withoutStaleBattery = stale ? alarms.filter((alarm) => alarm !== ALARM_LABELS.low_battery) : alarms;

  if (
    battery !== undefined &&
    battery <= LOW_BATTERY_THRESHOLD &&
    !withoutStaleBattery.includes(ALARM_LABELS.low_battery)
  ) {
    withoutStaleBattery.push(ALARM_LABELS.low_battery);
  }
  return withoutStaleBattery;
}

const ENUM_LABELS: Record<string, Record<string, string>> = {
  relay_status: {
    power_off: "Off after outage",
    power_on: "On after outage",
    last: "Restore last state",
    memory: "Restore last state",
  },
  battery_state: { high: "High", middle: "Medium", low: "Low" },
  beep_volume: { mute: "Muted", low: "Low", normal: "Normal", high: "High" },
  temp_unit_convert: { c: "Celsius", f: "Fahrenheit" },
  alarm_lock: ALARM_LABELS,
};

const BOOLEAN_LABELS: Record<string, [string, string]> = {
  doorcontact_state: ["Open", "Closed"],
  lock_motor_state: ["Unlocked", "Locked"],
  reverse_lock: ["Engaged", "Released"],
  anti_lock_outside: ["Engaged", "Released"],
  manual_lock: ["Engaged", "Released"],
  hijack: ["Triggered", "Normal"],
};

/**
 * Tuya reports scaled integers, so a temperature of 29.4 degrees arrives as 294.
 * The scale lives in the data point spec, which the cloud does not return here, so the
 * well-known scales are applied by code.
 */
const SCALED_UNITS: Record<string, { scale: number; unit: string }> = {
  va_temperature: { scale: 10, unit: "°C" },
  temp_current: { scale: 10, unit: "°C" },
  va_humidity: { scale: 1, unit: "%" },
  humidity_value: { scale: 1, unit: "%" },
  battery_percentage: { scale: 1, unit: "%" },
  residual_electricity: { scale: 1, unit: "%" },
  cur_power: { scale: 10, unit: "W" },
  cur_voltage: { scale: 10, unit: "V" },
  cur_current: { scale: 1, unit: "mA" },
};

export function formatStatusValue(status: FunctionItem, unit?: "c" | "f"): string {
  const { code, value } = status;

  if (typeof value === "boolean") {
    const labels = BOOLEAN_LABELS[code];
    if (labels) return value ? labels[0] : labels[1];
    return value ? "On" : "Off";
  }

  if (typeof value === "number") {
    const scaled = SCALED_UNITS[code];
    if (scaled) {
      const amount = value / scaled.scale;
      const shown = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
      if (scaled.unit === "°C" && unit === "f") {
        return `${((amount * 9) / 5 + 32).toFixed(1)}°F`;
      }
      return `${shown}${scaled.unit}`;
    }
    return String(value);
  }

  if (typeof value === "string") {
    return enumOptionLabel(code, value);
  }

  return "";
}

/**
 * The wording for one option of an Enum data point. Shared by the list and by the action
 * that sets it, so a curtain reading "Open" is set by an action also called "Open".
 */
export function enumOptionLabel(code: string, option: string): string {
  return ENUM_LABELS[code]?.[option] ?? humanizeCode(option);
}

/**
 * Enum data points a user can set, such as a curtain's Open/Stop/Close or a light's work
 * mode.
 *
 * Requiring a declared option list is also what keeps read-only data points out. `values`
 * reaches a status only through `getDeviceFunctions`, which merges it from the writable
 * instruction set, so a reported-but-not-settable string such as a lock's `alarm_lock`
 * never has one. Do not backfill `values` from the status payload.
 */
export function actionableEnums(device: Device): FunctionItem[] {
  return (device.status ?? []).filter(
    (status) =>
      !isNoiseStatus(status) && typeof status.value === "string" && parseEnumOptions(status.values).length > 0,
  );
}

/** Every data point a user can act on: booleans to flip, numbers to set, enums to choose. */
export function actionableStatuses(device: Device): FunctionItem[] {
  const enums = new Set(actionableEnums(device).map((status) => status.code));
  return (device.status ?? []).filter(
    (status) =>
      !isNoiseStatus(status) &&
      (typeof status.value === "boolean" || typeof status.value === "number" || enums.has(status.code)),
  );
}

/** Turns a data point code into a readable label when the cloud gave us no name. */
export function humanizeCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\bva\b/gi, "")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Readable names for the codes this extension shows most often. */
const CODE_LABELS: Record<string, string> = {
  residual_electricity: "Battery",
  battery_percentage: "Battery",
  battery_state: "Battery",
  va_temperature: "Temperature",
  temp_current: "Temperature",
  humidity_value: "Humidity",
  va_humidity: "Humidity",
  doorcontact_state: "Contact",
  lock_motor_state: "Lock",
  alarm_lock: "Last Alarm",
  relay_status: "After Power Outage",
  anti_lock_outside: "Anti-Lock",
  unlock_fingerprint: "Fingerprint Unlocks",
  unlock_password: "Password Unlocks",
  unlock_card: "Card Unlocks",
  unlock_ble: "Bluetooth Unlocks",
  unlock_app: "App Unlocks",
  unlock_phone_remote: "Remote Unlocks",
  unlock_temporary: "Temporary Unlocks",
  unlock_dynamic: "Dynamic Unlocks",
  unlock_request: "Unlock Requests",
  hijack: "Duress",
  beep_volume: "Beep Volume",
  manual_lock: "Manual Lock",
  reverse_lock: "Reverse Lock",
};

export function statusLabel(status: FunctionItem): string {
  if (status.name && status.name !== status.code) return status.name;
  return CODE_LABELS[status.code] ?? humanizeCode(status.code);
}

/** The data points worth showing in the detail panel, noise removed. */
export function meaningfulStatuses(device: Device): FunctionItem[] {
  return (device.status ?? []).filter((status) => !isNoiseStatus(status));
}

export function temperatureUnitOf(device: Device): "c" | "f" {
  const preferred = temperatureUnitPreference();
  if (preferred === "c" || preferred === "f") return preferred;

  const unit = (device.status ?? []).find((status) => status.code === "temp_unit_convert")?.value;
  return unit === "f" ? "f" : "c";
}

/** The one-line state shown next to the device name in the list. */
export function summaryOf(device: Device): string {
  const kind = classifyDevice(device);
  const unit = temperatureUnitOf(device);

  if (kind === "control") {
    const switches = (device.status ?? []).filter(isSwitchStatus);
    const on = switches.filter((status) => status.value === true).length;
    if (switches.length === 1) return switches[0].value ? "On" : "Off";
    return `${on}/${switches.length} on`;
  }

  if (kind === "lock") {
    const motor = (device.status ?? []).find((status) => status.code === "lock_motor_state");
    if (motor) return formatStatusValue(motor, unit);
    return "Locked";
  }

  const highlights = ["doorcontact_state", "va_temperature", "temp_current", "humidity_value", "va_humidity"];
  const parts = highlights
    .map((code) => (device.status ?? []).find((status) => status.code === code))
    .filter((status): status is FunctionItem => Boolean(status))
    .map((status) => formatStatusValue(status, unit));

  return parts.join(" · ");
}

/** Device names come from the Tuya app and often carry stray whitespace. */
export function cleanName(name: string): string {
  return (name ?? "").replace(/\s+/g, " ").trim();
}

/**
 * One line describing a device where there is no room for accessories, such as a menu
 * bar item: what it reads, how much battery it has left, and whether it is reachable.
 */
export function statusLine(device: Device): string {
  const parts: string[] = [];

  const alarms = alarmsOf(device);
  if (alarms.length > 0) parts.push(alarms.join(", "));

  const summary = summaryOf(device);
  if (summary) parts.push(summary);

  const battery = batteryOf(device);
  if (battery !== undefined) parts.push(`${battery}%`);

  if (!device.online) parts.push("Offline");

  return parts.join(" · ");
}

/** True when the device is reporting something the user would want to know about now. */
export function needsAttention(device: Device): boolean {
  if (alarmsOf(device).length > 0) return true;
  return (device.status ?? []).some((status) => status.code === "doorcontact_state" && status.value === true);
}

/**
 * Never handed to an assistant. These are credentials and locators, not device state:
 * `local_key` grants local control of the device, the lock blobs carry credential
 * material, and the address fields say where the user physically lives.
 * Everything else about a device is fair game.
 */
const SENSITIVE_CODES = new Set([
  "check_code_set",
  "ble_unlock_check",
  "remote_pd_setkey_check",
  "remote_no_dp_key",
  "unlock_method_create",
  "unlock_method_delete",
  "unlock_method_modify",
  "password",
  "temporary_password_creat",
  "lock_record",
  "record",
]);

export function isSensitiveStatus(status: FunctionItem): boolean {
  return SENSITIVE_CODES.has(status.code);
}

/**
 * Encoded bookkeeping that no consumer can parse. Kept separate from `isNoiseStatus`
 * on purpose: that one answers "what does a person want to read", and also hides an
 * idle countdown, which an assistant may legitimately be asked about. This one answers
 * "what can anything actually reason about".
 */
const OPAQUE_CODES = new Set(["synch_method", "rtc_lock"]);

export function isOpaqueStatus(status: FunctionItem): boolean {
  if (OPAQUE_CODES.has(status.code)) return true;
  return typeof status.value === "string" && /^[A-Za-z0-9+/]{12,}={0,2}$/.test(status.value);
}

export interface DeviceDescription {
  id: string;
  name: string;
  /** A ready-made sentence, so an assistant can answer without re-deriving wording. */
  summary: string;
  kind: DeviceKind;
  online: boolean;
  state: string;
  product?: string;
  model?: string;
  tuyaCategoryCode?: string;
  batteryPercent?: number;
  needsAttention?: string[];
  switches: { code: string; name: string; isOn: boolean }[];
  /** Every non-sensitive data point, formatted for reading and raw for reasoning. */
  readings: { code: string; name: string; value: string; raw: boolean | number | string | null }[];
  omitted?: string;
}

/**
 * Everything an assistant needs to answer questions about a device. Values are given
 * both formatted and raw: a `va_temperature` of 294 means 29.4 degrees, so answering
 * with the raw number would be wrong, but the raw value still allows comparisons.
 * Only credentials, physical locators and unparseable encoded values are withheld.
 */
export function describeDeviceForAI(device: Device): DeviceDescription {
  const unit = temperatureUnitOf(device);
  const alarms = alarmsOf(device);
  const battery = batteryOf(device);
  const withheld = (device.status ?? []).filter((s) => isSensitiveStatus(s) || isOpaqueStatus(s)).length;

  return {
    id: device.id,
    name: cleanName(device.name),
    summary: describeDeviceSentence(device),
    // The raw category is a Tuya code such as "mcs"; `kind` is the useful classification.
    kind: classifyDevice(device),
    online: Boolean(device.online),
    state: summaryOf(device),
    ...(battery !== undefined ? { batteryPercent: battery } : {}),
    ...(alarms.length > 0 ? { needsAttention: alarms } : {}),
    ...(device.product_name ? { product: device.product_name } : {}),
    ...(device.model ? { model: device.model } : {}),
    ...(device.category ? { tuyaCategoryCode: String(device.category) } : {}),
    switches: (device.status ?? [])
      .filter(isSwitchStatus)
      .map((status) => ({ code: status.code, name: statusLabel(status), isOn: status.value === true })),
    readings: (device.status ?? [])
      .filter((status) => !isSwitchStatus(status) && !isSensitiveStatus(status) && !isOpaqueStatus(status))
      .map((status) => ({
        code: status.code,
        name: statusLabel(status),
        value: formatStatusValue(status, unit),
        raw: status.value ?? null,
      })),
    ...(withheld > 0
      ? {
          omitted: `${withheld} data ${withheld === 1 ? "point was" : "points were"} withheld: lock credentials, or encoded values nothing can read.`,
        }
      : {}),
  };
}

const KIND_NOUNS: Record<DeviceKind, string> = {
  control: "switch",
  sensor: "sensor",
  lock: "lock",
};

/** A plain sentence describing the device, for an assistant to quote directly. */
export function describeDeviceSentence(device: Device): string {
  const name = cleanName(device.name);
  const noun = KIND_NOUNS[classifyDevice(device)];
  const state = summaryOf(device);
  const battery = batteryOf(device);
  const alarms = alarmsOf(device);

  let sentence = state ? `${name} is a ${noun} and is currently ${state}` : `${name} is a ${noun}`;

  if (battery !== undefined) sentence += `, battery at ${battery}%`;
  if (!device.online) sentence += ", but it is offline so this is the last known reading";
  sentence += ".";
  if (alarms.length > 0) sentence += ` It needs attention: ${alarms.join(", ")}.`;

  return sentence;
}

/** A one-line overview of a whole account, so an assistant can open with it. */
export function describeAccount(devices: Device[]): string {
  if (devices.length === 0) return "No devices are set up on this Tuya account.";

  const kinds = devices.map(classifyDevice);
  const controls = devices.filter((_, i) => kinds[i] === "control");
  const switchesOn = controls.filter((device) =>
    (device.status ?? []).some((status) => isSwitchStatus(status) && status.value === true),
  ).length;

  const parts: string[] = [];
  if (controls.length > 0)
    parts.push(`${controls.length} switchable ${controls.length === 1 ? "device" : "devices"} (${switchesOn} on)`);
  const sensors = kinds.filter((k) => k === "sensor").length;
  if (sensors > 0) parts.push(`${sensors} ${sensors === 1 ? "sensor" : "sensors"}`);
  const locks = kinds.filter((k) => k === "lock").length;
  if (locks > 0) parts.push(`${locks} ${locks === 1 ? "lock" : "locks"}`);

  const offline = devices.filter((device) => !device.online).length;
  const tail = offline > 0 ? `; ${offline} of them are offline` : "";

  return `${parts.join(", ")}${tail}.`;
}
