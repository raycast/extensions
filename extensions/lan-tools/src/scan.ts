import { execFileSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import { fromMDNSTypes } from "./deviceClass";
import { shortVendorForMac, vendorForMac } from "./oui";
import type { Device, ScanResult, Status } from "./types";

/**
 * Core network scan engine,
 *
 * Discovery source of truth = the neighbor (ARP) table, read via `arp -a`.
 * Raycast's Node runtime inherits Local Network consent from the signed
 * Raycast.app, so the subprocess `arp -a` works (verified: 255 lines). If that
 * ever fails, the fallback is a helper binary doing the sysctl read (see
 * PLAN.md Q4).
 */
export const IDLE_WINDOW_MINUTES = 10;

function computeClassFromMDNSType(type: string): string | undefined {
  return fromMDNSTypes([{ type }]);
}

interface Neighbor {
  ip: string;
  mac: string;
}

export interface PrimaryInterface {
  name: string;
  ip: string;
  prefixLen: number;
}

/** Find the primary interface (default route carrier) via os.networkInterfaces(). */
export function primaryInterface(): PrimaryInterface | undefined {
  const ifaces = networkInterfaces();
  // Prefer the interface that carries the default route: use `route get default`.
  const routeIface = defaultRouteInterface();
  for (const name of Object.keys(ifaces)) {
    if (routeIface && name !== routeIface) continue;
    const addrs = ifaces[name] || [];
    const ipv4 = addrs.find(
      (a) =>
        a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254"),
    );
    if (ipv4) {
      const prefixLen = netmaskToPrefix(ipv4.netmask);
      return { name, ip: ipv4.address, prefixLen };
    }
  }
  return undefined;
}

function defaultRouteInterface(): string | undefined {
  try {
    const out = execFileSync("/sbin/route", ["-n", "get", "default"], {
      encoding: "utf8",
    });
    const m = out.match(/interface:\s*(\S+)/);
    return m?.[1];
  } catch {
    return undefined;
  }
}

/** The default gateway IPv4 (e.g. "192.168.1.1"), from `route -n get default`. */
export function defaultGateway(): string | undefined {
  try {
    const out = execFileSync("/sbin/route", ["-n", "get", "default"], {
      encoding: "utf8",
    });
    const m = out.match(/gateway:\s*(\S+)/);
    return m?.[1];
  } catch {
    return undefined;
  }
}

function netmaskToPrefix(netmask: string): number {
  return netmask
    .split(".")
    .reduce(
      (n, octet) => n + Number(octet).toString(2).replace(/0/g, "").length,
      0,
    );
}

/** Read the neighbor table via `arp -a -n` (no reverse-DNS). Returns [] on failure. */
export function readNeighborTable(): Neighbor[] {
  try {
    // `-n` is critical: `arp -a` without it does a reverse-DNS lookup per IP,
    // which hangs on many home networks (verified: times out from Node; `-n`
    // returns instantly).
    const out = execFileSync("/usr/sbin/arp", ["-a", "-n"], {
      encoding: "utf8",
      timeout: 3000,
    });
    const neighbors: Neighbor[] = [];
    const re = /\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]{11,17})/i;
    for (const line of out.split("\n")) {
      const m = line.match(re);
      if (!m) continue;
      // macOS strips leading zeros in MAC octets (e.g. `d4:d:ab:9:44:c0`), so
      // normalize every octet back to two lowercase hex digits. This keeps the
      // MAC a stable 17-char identity key regardless of arp's display format.
      const mac = m[2]
        .toLowerCase()
        .split(":")
        .map((o) => o.padStart(2, "0"))
        .join(":");
      if (mac === "ff:ff:ff:ff:ff:ff" || mac.startsWith("00:00:00")) continue;
      neighbors.push({ ip: m[1], mac });
    }
    return neighbors;
  } catch {
    return [];
  }
}

/**
 * Pure: merge neighbors + mDNS names into a device map, aging out unseen
 * devices. ARP presence is authoritative for liveness — a device in the
 * neighbor table is on the network. Shared by the streaming orchestrator.
 */
export function buildDevices(
  previous: Record<string, Device>,
  neighbors: Neighbor[],
  mdn: {
    nameByIP: Record<string, string>;
    typeByIP: Record<string, string>;
    servicesByIP?: Record<string, import("./types").MDNSService[]>;
  },
  now: number,
): Device[] {
  const idleWindow = IDLE_WINDOW_MINUTES * 60;
  const devices: Record<string, Device> = {};
  const seenMACs = new Set<string>();

  for (const n of neighbors) {
    seenMACs.add(n.mac);
    const prev = previous[n.mac];
    const status: Status = "online";
    const mdnsServices = mdn.servicesByIP?.[n.ip] ?? [];

    // Best model/manufacturer across this device's advertised services.
    const model =
      mdnsServices.map((s) => s.model).find((m): m is string => !!m) ??
      prev?.model;
    const manufacturer =
      mdnsServices.map((s) => s.manufacturer).find((m): m is string => !!m) ??
      prev?.manufacturer;
    const classFromServices =
      mdnsServices.length > 0 ? fromMDNSTypes(mdnsServices) : undefined;

    const device: Device = prev
      ? {
          ...prev,
          ips: [n.ip, ...prev.ips.filter((x) => x !== n.ip)],
          lastSeen: now,
          lastOnline: now,
          status,
          // Refresh name from mDNS when available; keep prior name otherwise.
          name: mdn.nameByIP[n.ip] ?? prev.name,
          deviceClass:
            classFromServices ??
            (mdn.typeByIP[n.ip]
              ? (computeClassFromMDNSType(mdn.typeByIP[n.ip]) ??
                prev.deviceClass)
              : prev.deviceClass),
          mdnsServices,
          model,
          manufacturer,
        }
      : {
          mac: n.mac,
          bucket: "transient",
          name: mdn.nameByIP[n.ip],
          ips: [n.ip],
          vendor: vendorForMac(n.mac),
          vendorShort: shortVendorForMac(n.mac),
          deviceClass:
            classFromServices ??
            (mdn.typeByIP[n.ip]
              ? (computeClassFromMDNSType(mdn.typeByIP[n.ip]) ?? "unknown")
              : "unknown"),
          status,
          lastSeen: now,
          lastOnline: now,
          snapshotPorts: [],
          panelHint: [],
          mdnsServices,
          model,
          manufacturer,
        };

    device.bucket =
      device.bucket === "stable" ||
      (previous[n.mac] !== undefined && previous[n.mac].bucket === "stable")
        ? "stable"
        : "transient";
    devices[n.mac] = device;
  }

  // Age out devices not seen this sweep.
  for (const [mac, dev] of Object.entries(previous)) {
    if (seenMACs.has(mac)) continue;
    const wasOnlineRecently = now - dev.lastOnline <= idleWindow;
    const newStatus: Status =
      dev.status === "unknown"
        ? "unknown"
        : wasOnlineRecently
          ? "idle"
          : "offline";
    if (newStatus !== dev.status) {
      devices[mac] = { ...dev, status: newStatus, lastSeen: now };
    }
  }

  return Object.values(devices);
}

/**
 * Full scan: interface → neighbor table → merge → status.
 * `nameByIP`/`typeByIP` come from the mDNS resolver (mdns.ts).
 * Returns the aggregated device list.
 */
export async function scanNetwork(
  previous: Record<string, Device>,
  mdn: {
    nameByIP: Record<string, string>;
    typeByIP: Record<string, string>;
  } = { nameByIP: {}, typeByIP: {} },
): Promise<ScanResult> {
  const start = Date.now();
  const iface = primaryInterface();
  if (!iface) throw new Error("No primary interface found");
  const now = Date.now() / 1000;

  const neighbors = readNeighborTable();
  const devices = buildDevices(previous, neighbors, mdn, now);

  return {
    interfaceName: iface.name,
    interfaceIp: iface.ip,
    prefixLen: iface.prefixLen,
    sweptAt: now,
    durationSec: (Date.now() - start) / 1000,
    devices,
  };
}
