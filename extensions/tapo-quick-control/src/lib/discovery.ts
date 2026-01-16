import net from "net";
import find from "local-devices";
import { cloudLogin, loginDevice, loginDeviceByIp, type TapoDevice } from "tp-link-tapo-connect";
import { discoverLocalDevices } from "tp-link-tapo-connect/dist/discover";
import { getLocalSubnets, iterate24, normalizeSubnetPref } from "./net";
import { DeviceKind, Prefs } from "./types";

type ProbeResult = { ip: string; open: boolean };

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function kindFromModel(raw: string): DeviceKind | null {
  const modelRaw = raw.toUpperCase();
  if (modelRaw.includes("P110")) return "P110";
  if (modelRaw.includes("L530")) return "L530";
  return null;
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

async function tryIdentifyKind(prefs: Prefs, ip: string, timeoutMs: number): Promise<DeviceKind | null> {
  // Validate by logging in and reading device info
  const dev = await Promise.race([
    loginDeviceByIp(prefs.tapoEmail, prefs.tapoPassword, ip),
    (async () => {
      await delay(timeoutMs);
      throw new Error("timeout");
    })(),
  ]);

  const info = await Promise.race([
    dev.getDeviceInfo(),
    (async () => {
      await delay(timeoutMs);
      throw new Error("timeout");
    })(),
  ]);

  const modelRaw = String(info?.model ?? info?.device_model ?? "");
  return kindFromModel(modelRaw);
}

async function discoverByLocalDevices(prefs: Prefs, kind: DeviceKind): Promise<string | null> {
  let devices: { loginDevice: () => Promise<{ getDeviceInfo: () => Promise<{ ip?: string; model?: string; device_model?: string }> }> }[];

  try {
    devices = await discoverLocalDevices(prefs.tapoEmail, prefs.tapoPassword);
  } catch {
    return null;
  }

  for (const device of devices) {
    try {
      const dev = await Promise.race([
        device.loginDevice(),
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

      const modelRaw = String(info?.model ?? info?.device_model ?? "");
      const foundKind = kindFromModel(modelRaw);

      if (foundKind === kind && info?.ip) return info.ip;
    } catch {
      // ignore and try next device
    }
  }

  return null;
}

async function discoverByArpTable(prefs: Prefs, kind: DeviceKind): Promise<string | null> {
  let devices: { ip?: string }[];

  try {
    devices = await find({ skipNameResolution: true });
  } catch {
    return null;
  }

  for (const device of devices) {
    const ip = device.ip;
    if (!ip) continue;
    try {
      const foundKind = await tryIdentifyKind(prefs, ip, 1200);
      if (foundKind === kind) return ip;
    } catch {
      // ignore and try next device
    }
  }

  return null;
}

async function discoverByCloud(prefs: Prefs, kind: DeviceKind): Promise<string | null> {
  let devices: TapoDevice[];

  try {
    const cloud = await cloudLogin(prefs.tapoEmail, prefs.tapoPassword);
    devices = await cloud.listDevices();
  } catch {
    return null;
  }

  const candidates = devices.filter((d) => {
    const modelRaw = String(d.deviceModel ?? (d as { device_model?: string }).device_model ?? "");
    const found = kindFromModel(modelRaw);
    return found === kind || !modelRaw;
  });

  for (const device of candidates) {
    try {
      const dev = await Promise.race([
        loginDevice(prefs.tapoEmail, prefs.tapoPassword, device),
        (async () => {
          await delay(1500);
          throw new Error("timeout");
        })(),
      ]);

      const info = await Promise.race([
        dev.getDeviceInfo(),
        (async () => {
          await delay(1500);
          throw new Error("timeout");
        })(),
      ]);

      const modelRaw = String(info?.model ?? info?.device_model ?? "");
      const foundKind = kindFromModel(modelRaw);
      if (foundKind === kind && info?.ip) return info.ip;
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

export async function discoverByKind(
  prefs: Prefs,
  kind: DeviceKind,
  hintBases?: string[],
): Promise<string | null> {
  // 0) Fast local discovery without subnet scan
  const local = await discoverByLocalDevices(prefs, kind);
  if (local) return local;

  // 1) ARP table discovery (no MAC prefix filter)
  const arp = await discoverByArpTable(prefs, kind);
  if (arp) return arp;

  // 2) Cloud-assisted discovery (resolves local IP via MAC)
  const cloud = await discoverByCloud(prefs, kind);
  if (cloud) return cloud;

  const subnets = listScanSubnets(prefs, hintBases);
  if (subnets.length === 0) return null;

  for (const { base, cidr } of subnets) {
    // Bu implementasyon /24 içindir (hız + basitlik). /24 değilse yine de base üzerinden /24 tarıyoruz.
    if (cidr !== 24) {
      // İstersen sonra genişletebiliriz; şu an kesin ve hızlı olması için /24 ile sınırlı.
    }

    const ips = Array.from(iterate24(base));

    // 2) TCP 9999 hızlı tarama
    const probed = await mapLimit(ips, 64, (ip) => tcpProbe(ip, 9999, 180));
    const candidates = probed.filter((r) => r.open).map((r) => r.ip);

    // 3) Adaylarda kimlik doğrulama
    for (const ip of candidates) {
      try {
        const foundKind = await tryIdentifyKind(prefs, ip, 1200);
        if (foundKind === kind) return ip;
      } catch {
        // ignore
      }
    }
  }

  return null;
}
