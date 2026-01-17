import net from "net";
import find from "local-devices";
import { loginDeviceByIp } from "tp-link-tapo-connect";
import { discoverLocalDevices } from "tp-link-tapo-connect/dist/discover";
import { resolveMacToIp } from "tp-link-tapo-connect/dist/network-tools";
import { getLocalSubnets, iterate24, normalizeSubnetPref } from "./net";
import { DeviceRecord, Prefs } from "./types";

export type DiscoveryHints = {
  manualIp?: string | null;
  cachedIp?: string | null;
};

type ProbeResult = { ip: string; open: boolean };

type DeviceInfoShape = {
  device_id?: string;
  deviceId?: string;
  mac?: string;
  model?: string;
  device_model?: string;
  ip?: string;
};

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

function normalizeMac(raw?: string): string | null {
  if (!raw) return null;
  return raw.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
}

function deviceMatches(info: DeviceInfoShape, target: DeviceRecord): boolean {
  const infoId = info.device_id ?? info.deviceId;
  if (infoId && infoId === target.id) return true;

  const infoMac = normalizeMac(info.mac);
  const targetMac = normalizeMac(target.mac);
  if (infoMac && targetMac && infoMac === targetMac) return true;

  const modelRaw = String(info.model ?? info.device_model ?? "").toUpperCase();
  const targetModel = target.model?.toUpperCase();
  if (modelRaw && targetModel && modelRaw === targetModel) return true;

  return false;
}

async function tcpProbe(ip: string, port: number, timeoutMs: number): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (open: boolean) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {}
      resolve({ ip, open });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));

    socket.connect(port, ip);
  });
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const current = items[idx++];
      results.push(await fn(current));
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker());
  await Promise.all(workers);
  return results;
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

async function getInfoWithTimeout(dev: { getDeviceInfo: () => Promise<DeviceInfoShape> }, timeoutMs: number) {
  return Promise.race([
    dev.getDeviceInfo(),
    (async () => {
      await delay(timeoutMs);
      throw new Error("timeout");
    })(),
  ]);
}

async function verifyIpForDevice(prefs: Prefs, device: DeviceRecord, ip: string, timeoutMs: number): Promise<boolean> {
  const probe = await tcpProbe(ip, 80, 200);
  if (!probe.open) return false;

  const dev = await connectWithTimeout(prefs, ip, timeoutMs);
  const info = await getInfoWithTimeout(dev, timeoutMs);
  return deviceMatches(info, device);
}

async function discoverByLocalDevices(prefs: Prefs, device: DeviceRecord): Promise<string | null> {
  let devices: { loginDevice: () => Promise<{ getDeviceInfo: () => Promise<DeviceInfoShape> }> }[];

  try {
    devices = await discoverLocalDevices(prefs.tapoEmail, prefs.tapoPassword);
  } catch {
    return null;
  }

  for (const candidate of devices) {
    try {
      const dev = await Promise.race([
        candidate.loginDevice(),
        (async () => {
          await delay(1000);
          throw new Error("timeout");
        })(),
      ]);

      const info = await Promise.race([
        dev.getDeviceInfo(),
        (async () => {
          await delay(1000);
          throw new Error("timeout");
        })(),
      ]);

      if (deviceMatches(info, device)) {
        return info.ip ?? null;
      }
    } catch {
      // ignore and try next device
    }
  }

  return null;
}

async function discoverByArpTable(prefs: Prefs, device: DeviceRecord): Promise<string | null> {
  let devices: { ip?: string }[];

  try {
    devices = await find({ skipNameResolution: true });
  } catch {
    return null;
  }

  for (const candidate of devices) {
    const ip = candidate.ip;
    if (!ip) continue;
    try {
      const ok = await verifyIpForDevice(prefs, device, ip, 1200);
      if (ok) return ip;
    } catch {
      // ignore and try next device
    }
  }

  return null;
}

function listScanSubnets(prefs: Prefs, hintBases?: string[]) {
  const seen = new Set<string>();
  const out: { base: string; cidr: number }[] = [];

  for (const base of hintBases ?? []) {
    let subnet = null;
    try {
      subnet = normalizeSubnetPref(base);
    } catch {
      subnet = null;
    }
    if (!subnet || seen.has(subnet.base)) continue;
    seen.add(subnet.base);
    out.push(subnet);
  }

  let override = null;
  try {
    override = normalizeSubnetPref(prefs.subnet);
  } catch {
    override = null;
  }
  const sources = override ? [override] : getLocalSubnets();
  for (const subnet of sources) {
    if (seen.has(subnet.base)) continue;
    seen.add(subnet.base);
    out.push(subnet);
  }

  return out;
}

export async function discoverDeviceIp(
  prefs: Prefs,
  device: DeviceRecord,
  hints?: DiscoveryHints,
): Promise<string | null> {
  const manualIp = hints?.manualIp ?? null;
  const cachedIp = hints?.cachedIp ?? null;

  if (manualIp) {
    try {
      const ok = await verifyIpForDevice(prefs, device, manualIp, 900);
      if (ok) return manualIp;
    } catch {
      // manual fail -> continue
    }
  }

  if (cachedIp) {
    try {
      const ok = await verifyIpForDevice(prefs, device, cachedIp, 900);
      if (ok) return cachedIp;
    } catch {
      // cache fail -> continue
    }
  }

  if (device.ip) {
    try {
      const ok = await verifyIpForDevice(prefs, device, device.ip, 900);
      if (ok) return device.ip;
    } catch {
      // cloud ip fail -> continue
    }
  }

  if (device.mac) {
    try {
      const macIp = await resolveMacToIp(device.mac);
      if (macIp) {
        const ok = await verifyIpForDevice(prefs, device, macIp, 1000);
        if (ok) return macIp;
      }
    } catch {
      // ignore
    }
  }

  const local = await discoverByLocalDevices(prefs, device);
  if (local) return local;

  const arp = await discoverByArpTable(prefs, device);
  if (arp) return arp;

  const hintBases = [manualIp, cachedIp, device.ip]
    .map((ip) => (ip ? baseFromIp(ip) : null))
    .filter(Boolean) as string[];

  const subnets = listScanSubnets(prefs, hintBases);
  if (subnets.length === 0) return null;

  for (const { base } of subnets) {
    const ips = Array.from(iterate24(base));
    const probed = await mapLimit(ips, 64, (ip) => tcpProbe(ip, 80, 180));
    const candidates = probed.filter((r) => r.open).map((r) => r.ip);

    for (const ip of candidates) {
      try {
        const ok = await verifyIpForDevice(prefs, device, ip, 1200);
        if (ok) return ip;
      } catch {
        // ignore
      }
    }
  }

  return null;
}
