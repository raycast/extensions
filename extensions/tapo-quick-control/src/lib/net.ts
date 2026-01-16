import os from "os";

export type Subnet = { base: string; cidr: number };

export function detectLocalIPv4(): string | null {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    const arr = ifaces[name] || [];
    for (const info of arr) {
      if (info.family === "IPv4" && !info.internal) {
        return info.address;
      }
    }
  }
  return null;
}

function baseFromIPv4(ip: string): string | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
  return `${nums[0]}.${nums[1]}.${nums[2]}.0`;
}

export function normalizeSubnetPref(subnetPref?: string): Subnet | null {
  if (!subnetPref) return null;
  const raw = subnetPref.trim();
  if (!raw) return null;

  if (raw.includes("/")) {
    const [baseRaw, cidrStr] = raw.split("/");
    const cidr = Number(cidrStr);
    const base = baseFromIPv4(baseRaw ?? "");
    if (!base || !Number.isFinite(cidr)) throw new Error("Invalid subnet preference");
    return { base, cidr };
  }

  const base = baseFromIPv4(raw);
  if (!base) throw new Error("Invalid subnet preference");
  return { base, cidr: 24 };
}

export function getLocalSubnets(): Subnet[] {
  const ifaces = os.networkInterfaces();
  const out: Subnet[] = [];
  const seen = new Set<string>();

  for (const name of Object.keys(ifaces)) {
    const arr = ifaces[name] || [];
    for (const info of arr) {
      if (info.family !== "IPv4" || info.internal) continue;
      const base = baseFromIPv4(info.address);
      if (!base || seen.has(base)) continue;
      seen.add(base);
      out.push({ base, cidr: 24 });
    }
  }

  return out;
}

// Accepts "192.168.1.0/24" or empty -> infer from local ip as "x.y.z.0/24"
export function resolveSubnet(subnetPref?: string): Subnet {
  const override = normalizeSubnetPref(subnetPref);
  if (override) return override;

  const local = detectLocalIPv4();
  if (!local) throw new Error("Cannot detect local IPv4. Please set Subnet preference (e.g., 192.168.1.0/24).");

  const base = baseFromIPv4(local);
  if (!base) throw new Error("Invalid local IP");
  return { base, cidr: 24 };
}

export function* iterate24(base: string): Generator<string> {
  // base must be x.y.z.0
  const p = base.split(".");
  if (p.length !== 4) throw new Error("Invalid base");
  const prefix = `${p[0]}.${p[1]}.${p[2]}.`;
  for (let i = 1; i <= 254; i++) yield `${prefix}${i}`;
}
