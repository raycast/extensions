import { Cache } from "@raycast/api";
import axios, { AxiosInstance } from "axios";
import { NANOLEAF_API_PORT, PAIRING_TIMEOUT_MS } from "../constants";
import { DeviceInfo } from "../types";

function readCached(key: string): string {
  const raw = new Cache().get(key);
  if (!raw) return "";
  try {
    return JSON.parse(raw) as string;
  } catch {
    return "";
  }
}

function createHttp(deviceAddress: string): AxiosInstance {
  return axios.create({ baseURL: `http://${deviceAddress}:${NANOLEAF_API_PORT}/api/v1` });
}

function getClient(): { http: AxiosInstance; token: string } {
  const deviceAddress = readCached("device-address");
  const deviceToken = readCached("device-token");
  if (!deviceAddress || !deviceToken) {
    throw new Error("Device is not paired. Run the Pair Device command first.");
  }
  return { http: createHttp(deviceAddress), token: deviceToken };
}

export async function pair(): Promise<string> {
  const deviceAddress = readCached("device-address");
  if (!deviceAddress) {
    throw new Error("Device address is not set.");
  }
  const { data } = await createHttp(deviceAddress).post("/new", {}, { timeout: PAIRING_TIMEOUT_MS });
  if (!data?.auth_token) {
    throw new Error("Device responded without an auth token.");
  }
  return data.auth_token;
}

export async function setPower(on: boolean): Promise<void> {
  const { http, token } = getClient();
  await http.put(`/${token}/state`, { on: { value: on } });
}

export async function setBrightness(brightness: number): Promise<void> {
  const { http, token } = getClient();
  await http.put(`/${token}/state`, { brightness: { value: brightness } });
}

export async function setColor(hue: number, saturation: number, brightness?: number): Promise<void> {
  const { http, token } = getClient();
  const body: Record<string, { value: number }> = {
    hue: { value: hue },
    sat: { value: saturation },
  };
  if (brightness !== undefined) {
    body.brightness = { value: brightness };
  }
  await http.put(`/${token}/state`, body);
}

export async function setEffect(effect: string): Promise<void> {
  const { http, token } = getClient();
  await http.put(`/${token}/effects`, { select: effect });
}

export async function identify(): Promise<void> {
  const { http, token } = getClient();
  await http.put(`/${token}/identify`);
}

export async function getEffects(): Promise<string[]> {
  const { http, token } = getClient();
  const { data } = await http.get<string[]>(`/${token}/effects/effectsList`);
  return data;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const { http, token } = getClient();
  const { data } = await http.get(`/${token}`);
  delete data.panelLayout;
  delete data.rhythm;
  return data as DeviceInfo;
}
