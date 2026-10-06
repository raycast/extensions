import { Cache, LocalStorage, getPreferenceValues } from "@raycast/api";
import { createHash } from "node:crypto";

const BASE = "https://api.developer.atomberg-iot.com";
const TOKEN_KEY = "access-token";
const DEVICES_KEY = "devices";
const ACCOUNT_KEY = "account-fingerprint";

/** A fan as returned by /v1/get_list_of_devices. */
export interface Device {
  device_id: string;
  name: string;
  model: string;
  series: string;
  color: string;
}

/** A fan's state as returned by /v1/get_device_state. */
export interface DeviceState {
  device_id: string;
  power: boolean;
  last_recorded_speed: number;
  sleep_mode?: boolean;
  led?: boolean;
  timer_hours?: number;
  timer_time_elapsed_mins?: number;
  last_recorded_brightness?: number;
  last_recorded_color?: string;
}

export type Fan = Device & Omit<DeviceState, "device_id">;

/** Every command the cloud API accepts. */
export interface Command {
  power?: boolean;
  speed?: number;
  sleep?: boolean;
  led?: boolean;
  timer?: number;
  brightness?: number;
  light_mode?: string;
}

export const SPEEDS = [1, 2, 3, 4, 5, 6];

/**
 * Timer command values and the duration each maps to. The command value and the
 * hours reported back in `timer_hours` only agree up to 3 hours.
 */
export const TIMERS: { value: number; hours: number; label: string }[] = [
  { value: 0, hours: 0, label: "Off" },
  { value: 1, hours: 1, label: "1 Hour" },
  { value: 2, hours: 2, label: "2 Hours" },
  { value: 3, hours: 3, label: "3 Hours" },
  { value: 4, hours: 6, label: "6 Hours" },
];

/** The timer command that corresponds to a `timer_hours` reading. */
export function timerForHours(hours: number | undefined): number {
  return TIMERS.find((timer) => timer.hours === (hours ?? 0))?.value ?? 0;
}

/** The device list changes rarely, so it survives between launches. */
const cache = new Cache();

/**
 * A stable fingerprint of the current credentials. Hashed rather than stored
 * verbatim, so the keys themselves stay in the keychain.
 */
function accountFingerprint(): string {
  const { apiKey, refreshToken } = getPreferenceValues<Preferences>();
  return createHash("sha256").update(`${apiKey}\u0000${refreshToken}`).digest("hex").slice(0, 16);
}

/**
 * Drop anything cached under different credentials.
 *
 * Editing the API key or refresh token in preferences would otherwise leave a
 * still-valid access token and the previous account's device list in place, and
 * the new account would list — and control — the old account's fans.
 */
async function ensureCurrentAccount(): Promise<void> {
  const current = accountFingerprint();
  if ((await LocalStorage.getItem<string>(ACCOUNT_KEY)) === current) return;

  await LocalStorage.removeItem(TOKEN_KEY);
  cache.remove(DEVICES_KEY);
  await LocalStorage.setItem(ACCOUNT_KEY, current);
}

/**
 * Whether to offer light controls for a fan.
 *
 * Not every Atomberg fan has a light, and the API omits `led` from the state of
 * those that don't. Keying off the response rather than a hard-coded model list
 * means the control only shows up where it actually does something.
 */
export function hasLight(fan: Fan): boolean {
  return fan.led !== undefined;
}

export class AtombergError extends Error {}

interface Envelope<T> {
  status?: string;
  message?: T | string;
}

async function request<T>(path: string, bearer: string, method = "GET", body?: Command | object): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();

  let response: Response;
  try {
    response = await fetch(BASE + path, {
      method,
      headers: {
        "X-API-Key": apiKey,
        Authorization: `Bearer ${bearer}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AtombergError("Can't reach the Atomberg cloud. Check your internet connection.");
  }

  if (response.status === 403) {
    throw new AtombergError("Access denied — is Developer Mode still enabled in the Atomberg app?");
  }
  if (response.status === 429) {
    throw new AtombergError("Rate limited by Atomberg (the API allows roughly 100 calls a day).");
  }

  let payload: Envelope<T>;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    throw new AtombergError(`Atomberg returned an unreadable response (HTTP ${response.status}).`);
  }

  if (payload.status !== "Success") {
    const detail = typeof payload.message === "string" ? payload.message : `HTTP ${response.status}`;
    throw new AtombergError(detail);
  }
  return payload.message as T;
}

/** `exp` out of a JWT, without verifying it — we only need to know when to refresh. */
function expiresAt(token: string): number {
  try {
    const payload = token.split(".")[1];
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof claims.exp === "number" ? claims.exp : 0;
  } catch {
    return 0;
  }
}

async function accessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = await LocalStorage.getItem<string>(TOKEN_KEY);
    if (cached && expiresAt(cached) - 60 > Date.now() / 1000) {
      return cached;
    }
  }

  const { refreshToken } = getPreferenceValues<Preferences>();
  const { access_token } = await request<{ access_token: string }>("/v1/get_access_token", refreshToken);
  await LocalStorage.setItem(TOKEN_KEY, access_token);
  return access_token;
}

/** Authenticated call that retries once with a fresh token if the cached one was rejected. */
async function authed<T>(path: string, method = "GET", body?: Command | object): Promise<T> {
  try {
    return await request<T>(path, await accessToken(), method, body);
  } catch (error) {
    if (error instanceof AtombergError && /expired|unauthor/i.test(error.message)) {
      return request<T>(path, await accessToken(true), method, body);
    }
    throw error;
  }
}

async function listDevices(forceRefresh: boolean): Promise<Device[]> {
  if (!forceRefresh) {
    const cached = cache.get(DEVICES_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as Device[];
      } catch {
        // fall through and re-fetch
      }
    }
  }

  const { devices_list } = await authed<{ devices_list: Device[] }>("/v1/get_list_of_devices");
  cache.set(DEVICES_KEY, JSON.stringify(devices_list));
  return devices_list;
}

/**
 * Load every fan with its current state.
 *
 * One call for the states, plus one for the device list only when it isn't
 * cached yet — the developer API is limited to about 100 calls a day.
 */
export async function loadFans(forceRefresh = false): Promise<Fan[]> {
  await ensureCurrentAccount();
  const devices = await listDevices(forceRefresh);
  const { device_state } = await authed<{ device_state: DeviceState[] }>("/v1/get_device_state?device_id=all");

  const states = new Map(device_state.map((state) => [state.device_id, state]));
  return devices.map((device) => {
    const state = states.get(device.device_id);
    return {
      ...device,
      // Names come back exactly as typed in the Atomberg app, padding included.
      name: device.name?.trim() || device.device_id,
      power: state?.power ?? false,
      last_recorded_speed: state?.last_recorded_speed ?? 1,
      sleep_mode: state?.sleep_mode,
      led: state?.led,
      timer_hours: state?.timer_hours,
      last_recorded_brightness: state?.last_recorded_brightness,
      last_recorded_color: state?.last_recorded_color,
    };
  });
}

export async function sendCommand(deviceId: string, command: Command): Promise<void> {
  await ensureCurrentAccount();
  await authed("/v1/send_command", "POST", { device_id: deviceId, command });
}

/**
 * Forget everything this extension stored: the cached access token and the
 * device list.
 *
 * The API key and refresh token live in Raycast's preferences (the macOS
 * keychain) and there is no API to write preferences, so those have to be
 * cleared by hand in the preferences pane.
 */
export async function clearStoredData(): Promise<void> {
  await LocalStorage.removeItem(TOKEN_KEY);
  cache.remove(DEVICES_KEY);
}
