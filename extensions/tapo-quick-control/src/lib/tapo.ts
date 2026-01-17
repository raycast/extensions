import { cloudLogin, loginDeviceByIp, type TapoDeviceInfo } from "tp-link-tapo-connect";
import { discoverDeviceIp } from "./discovery";
import { getStrings } from "./i18n";
import { getCachedDevice, setCachedDevice, touchDevice } from "./storage";
import { categorizeDevice } from "./device-utils";
import { DeviceRecord, Prefs } from "./types";

type DeviceConnection = {
  dev: { turnOn: () => Promise<void>; turnOff: () => Promise<void>; setHSL: (h: number, s: number, l: number) => Promise<void>; setBrightness: (b: number) => Promise<void>; getDeviceInfo: () => Promise<TapoDeviceInfo> };
  ip: string;
  discovered: boolean;
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseIpOverrides(raw?: string): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  const entries = raw
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const [keyRaw, ipRaw] = entry.split("=").map((s) => s.trim());
    if (!keyRaw || !ipRaw) continue;
    out[keyRaw.toLowerCase()] = ipRaw;
  }

  return out;
}

function getManualIpForDevice(prefs: Prefs, device: DeviceRecord): string | null {
  const overrides = parseIpOverrides(prefs.ipOverrides);
  const byId = overrides[device.id.toLowerCase()];
  if (byId) return byId;

  const aliasKey = device.alias?.trim().toLowerCase();
  if (aliasKey && overrides[aliasKey]) return overrides[aliasKey];

  const modelKey = device.model?.trim().toLowerCase();
  if (modelKey && overrides[modelKey]) return overrides[modelKey];

  const model = device.model?.toUpperCase() ?? "";
  if (prefs.p110Ip && model.includes("P110")) return prefs.p110Ip.trim();
  if (prefs.l530Ip && model.includes("L530")) return prefs.l530Ip.trim();

  return null;
}

async function connectWithTimeout(prefs: Prefs, ip: string, timeoutMs: number) {
  const devPromise = loginDeviceByIp(prefs.tapoEmail, prefs.tapoPassword, ip);

  return Promise.race([
    devPromise,
    (async () => {
      await delay(timeoutMs);
      throw new Error("timeout");
    })(),
  ]);
}

export async function listDevices(prefs: Prefs): Promise<DeviceRecord[]> {
  const cloud = await cloudLogin(prefs.tapoEmail, prefs.tapoPassword);
  const devices = await cloud.listDevices();

  return devices.map((d) => ({
    id: d.deviceId,
    alias: d.alias || d.deviceName || d.deviceModel,
    model: d.deviceModel,
    type: d.deviceType,
    mac: d.deviceMac,
    category: categorizeDevice(d.deviceModel, d.deviceType),
    ip: d.ip,
  }));
}

export async function getDeviceConnection(prefs: Prefs, device: DeviceRecord): Promise<DeviceConnection> {
  const cached = await getCachedDevice(device.id);
  const manualIp = getManualIpForDevice(prefs, device);

  let ip = null;
  if (manualIp) ip = manualIp;

  if (!ip && cached?.ip) {
    try {
      const dev = await connectWithTimeout(prefs, cached.ip, 800);
      await touchDevice(device.id);
      return { dev, ip: cached.ip, discovered: false };
    } catch {
      // cache fail -> discovery
    }
  }

  ip = await discoverDeviceIp(prefs, device, { manualIp, cachedIp: cached?.ip ?? null });
  if (!ip) {
    const strings = getStrings(prefs);
    throw new Error(strings.deviceNotFound(device.alias || device.model || device.id));
  }

  const dev = await connectWithTimeout(prefs, ip, 1200);
  await setCachedDevice({
    id: device.id,
    ip,
    alias: device.alias,
    model: device.model,
    category: device.category,
    lastSeenAt: Date.now(),
  });
  return { dev, ip, discovered: true };
}

export async function getDeviceInfo(prefs: Prefs, device: DeviceRecord) {
  const { dev, ip } = await getDeviceConnection(prefs, device);
  const info = await dev.getDeviceInfo();
  return { info, ip };
}

export async function setDevicePower(prefs: Prefs, device: DeviceRecord, on: boolean) {
  const { dev } = await getDeviceConnection(prefs, device);
  if (on) return dev.turnOn();
  return dev.turnOff();
}

export async function setLightColorHS(prefs: Prefs, device: DeviceRecord, hue: number, sat: number) {
  const { dev } = await getDeviceConnection(prefs, device);
  const h = Math.max(0, Math.min(360, Math.round(hue)));
  const s = Math.max(0, Math.min(100, Math.round(sat)));
  let lum = 100;
  try {
    const info = await dev.getDeviceInfo();
    const brightness = (info as { brightness?: number }).brightness;
    if (typeof brightness === "number" && Number.isFinite(brightness)) lum = brightness;
  } catch {
    // Best-effort: keep default brightness.
  }
  return dev.setHSL(h, s, lum);
}

export async function setLightBrightness(prefs: Prefs, device: DeviceRecord, brightness: number) {
  const { dev } = await getDeviceConnection(prefs, device);
  const b = Math.max(1, Math.min(100, Math.round(brightness)));
  return dev.setBrightness(b);
}
