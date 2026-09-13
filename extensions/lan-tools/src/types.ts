export type Status = "unknown" | "online" | "idle" | "offline";
export type Bucket = "stable" | "transient";

/** One advertised mDNS service on a device (one row from `dns-sd -L`). */
export interface MDNSService {
  /** Full service type, e.g. `_airplay._tcp`, `_hap._tcp`, `_ipp._tcp`. */
  type: string;
  /** Port the service listens on (from the `-L` lookup), if reported. */
  port?: number;
  /** Model string from TXT (`md`/`model`/`ty`/`product`), if present. */
  model?: string;
  /** Manufacturer from TXT (`manufacturer`/`usb_MFG`), if present. */
  manufacturer?: string;
  /** HomeKit accessory category id (`ci`), if present. */
  category?: string;
}

export interface Device {
  mac: string;
  bucket: Bucket;
  name?: string;
  ips: string[];
  vendor?: string;
  vendorShort?: string;
  deviceClass: string;
  status: Status;
  lastSeen: number;
  lastOnline: number;
  snapshotPorts: number[];
  panelHint: string[];
  /** Advertised mDNS services (from the sweep). */
  mdnsServices: MDNSService[];
  /** Best-known model name (richest TXT across the device's services). */
  model?: string;
  /** Best-known manufacturer (richest TXT). */
  manufacturer?: string;
}

export interface ScanResult {
  interfaceName: string;
  interfaceIp: string;
  prefixLen: number;
  sweptAt: number;
  durationSec: number;
  devices: Device[];
}

export interface StoredState {
  version: 1;
  prefs: { classMode: "instant" | "accurate" };
  lastSweepAt?: number;
  /** The network this state was last swept on (interface IP + prefix). */
  network?: { ip: string; prefixLen: number };
  devices: Record<string, Device>;
  lastChanges: { mac: string; kind: string; detail: string; at: number }[];
}
