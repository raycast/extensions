import { loginDeviceByIp } from "tp-link-tapo-connect";
import { discoverByKind } from "./discovery";
import { getStrings } from "./i18n";
import { getCache, setCachedDevice, touchDevice } from "./storage";
import { DeviceKind, Prefs } from "./types";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function baseFromIp(ip: string): string | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
  return `${nums[0]}.${nums[1]}.${nums[2]}.0`;
}

function getManualIp(prefs: Prefs, kind: DeviceKind): string | null {
  const raw = kind === "P110" ? prefs.p110Ip : prefs.l530Ip;
  const ip = raw?.trim();
  return ip ? ip : null;
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

export async function getDevice(prefs: Prefs, kind: DeviceKind) {
  const cache = await getCache();
  const cached = cache[kind];

  // 0) manual IP (override)
  const manualIp = getManualIp(prefs, kind);
  const hintBases = [manualIp, cached?.ip].map((ip) => (ip ? baseFromIp(ip) : null)).filter(Boolean) as string[];
  if (manualIp) {
    try {
      const dev = await connectWithTimeout(prefs, manualIp, 800);
      await setCachedDevice(kind, manualIp, kind);
      return { dev, ip: manualIp, discovered: false };
    } catch {
      // manual fail -> try cache/discovery
    }
  }

  // 1) cache IP ile ultra-hizli check
  if (cached?.ip) {
    try {
      const dev = await connectWithTimeout(prefs, cached.ip, 800);
      await touchDevice(kind);
      return { dev, ip: cached.ip, discovered: false };
    } catch {
      // cache fail -> discovery
    }
  }

  // 2) discovery
  const ip = await discoverByKind(prefs, kind, hintBases);
  if (!ip) {
    const strings = getStrings(prefs);
    throw new Error(strings.deviceNotFound(kind));
  }

  // 3) yeni IP ile baglan + cachele
  const dev = await connectWithTimeout(prefs, ip, 1200);
  await setCachedDevice(kind, ip, kind);
  return { dev, ip, discovered: true };
}

export async function getInfo(prefs: Prefs, kind: DeviceKind) {
  const { dev } = await getDevice(prefs, kind);
  return dev.getDeviceInfo();
}

export async function setPlugPower(prefs: Prefs, on: boolean) {
  const { dev } = await getDevice(prefs, "P110");
  if (on) return dev.turnOn();
  return dev.turnOff();
}

export async function setLightPower(prefs: Prefs, on: boolean) {
  const { dev } = await getDevice(prefs, "L530");
  if (on) return dev.turnOn();
  return dev.turnOff();
}

// L530 color: Hue 0-360, Saturation 0-100
export async function setLightColorHS(prefs: Prefs, hue: number, sat: number) {
  const { dev } = await getDevice(prefs, "L530");
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
