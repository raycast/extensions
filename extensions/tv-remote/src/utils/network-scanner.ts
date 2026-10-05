import { networkInterfaces } from "os";
import { getSystemInfo, type SonySystemInfo } from "./sony-api";

export interface DiscoveredTV {
  ip: string;
  info: SonySystemInfo;
}

export interface NetworkInfo {
  localIP: string;
  subnet: string;
}

export function getLocalIP(): string {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const info of iface) {
        // Skip internal (localhost) and non-IPv4 addresses
        if (info.family === "IPv4" && !info.internal && info.address) {
          return info.address;
        }
      }
    }
  }
  return "Unknown";
}

export function getSubnet(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }
  return "Unknown";
}

export async function scanForSonyTV(onProgress?: (progress: number) => void): Promise<DiscoveredTV | null> {
  const localIP = getLocalIP();
  const subnet = getSubnet(localIP);

  if (subnet === "Unknown") {
    return null;
  }

  const skipIps = new Set([localIP, `${subnet}.1`, `${subnet}.254`]);
  const total = 253;
  let checkedCount = 0;

  // Create batches of IPs to scan in parallel
  const BATCH_SIZE = 50;
  const allIps: string[] = [];

  for (let i = 2; i <= 254; i++) {
    const ip = `${subnet}.${i}`;
    if (!skipIps.has(ip)) {
      allIps.push(ip);
    } else {
      checkedCount++;
    }
  }

  // Process in batches
  for (let i = 0; i < allIps.length; i += BATCH_SIZE) {
    const batch = allIps.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (ip) => {
      try {
        // Use 500ms timeout for discovery
        const info = await getSystemInfo(ip, 500);
        return info ? { ip, info } : null;
      } catch {
        return null;
      } finally {
        checkedCount++;
      }
    });

    const results = await Promise.all(promises);

    // Check if we found a TV in this batch
    const found = results.find((r): r is DiscoveredTV => r !== null);

    if (onProgress) {
      onProgress(Math.round((checkedCount / total) * 100));
    }

    if (found) {
      if (onProgress) {
        onProgress(100);
      }
      return found;
    }
  }

  return null;
}
