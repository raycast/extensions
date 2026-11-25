import { Category, bcdToString, hex4, prettyName, speedFrom } from "./lookups";
import type { UsbDevice } from "./usb";

// ---------- formatting ----------

export function bytes(n?: number): string | undefined {
  if (!n) return undefined;
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1000 && i < u.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`;
}

export function bps(n: number): string {
  return n >= 1e9 ? `${+(n / 1e9).toFixed(1)} Gb/s` : `${Math.round(n / 1e6)} Mb/s`;
}

export function ago(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
}

/** Name for display: tidied, and unnamed devices get "<Vendor> hub (0x2534)" instead of "Unknown device …". */
export function label(d: UsbDevice): string {
  return /^Unknown device/i.test(d.name)
    ? `${d.vendor ?? "Unknown"} ${d.isHub ? "hub" : "device"} (${hex4(d.productId)})`
    : prettyName(d.name);
}
export const primaryCategory = (d: UsbDevice): Category | undefined => d.categories[0];
export const vidpid = (d: UsbDevice) => `${hex4(d.vendorId)}:${hex4(d.productId)}`;

/** True when a USB 3-capable device negotiated USB 2 or slower: usually a cable, adapter or port problem. */
export function linkDowngraded(d: UsbDevice): boolean {
  const s = speedFrom(d.speedCode, d.linkBps);
  return !!s && (d.bcdUSB ?? 0) >= 0x0300 && s.code < 3 && !d.isHub;
}

export function powerText(d: UsbDevice): string | undefined {
  if (d.powerAllocatedmA !== undefined) return `${d.powerAllocatedmA} mA`;
  return undefined;
}

export function summary(d: UsbDevice): string {
  const s = speedFrom(d.speedCode, d.linkBps);
  const lines = [
    `${d.name}${d.vendor ? ` — ${d.vendor}` : ""}`,
    `ID ${vidpid(d)}${d.serial ? `  ·  S/N ${d.serial}` : ""}`,
    `Type: ${d.categories.join(", ") || "Unknown"}`,
    s ? `Link: ${s.rate}${d.bcdUSB ? `, USB ${bcdToString(d.bcdUSB)} device` : ""}` : undefined,
    powerText(d) ? `Power: ${powerText(d)}` : undefined,
    d.locationId !== undefined ? `Location: 0x${d.locationId.toString(16).padStart(8, "0")}` : undefined,
    d.path.length ? `Via: ${d.path.join(" › ")}` : undefined,
    ...d.disks.flatMap((k) =>
      k.volumes.map((v) => `Volume: ${v.name ?? v.bsd}${v.mountPoint ? ` → ${v.mountPoint}` : ""}`),
    ),
    ...d.serialPorts.map((p) => `Serial: ${p}`),
    ...d.networkInterfaces.map((n) => `Network: ${n}`),
  ];
  return lines.filter(Boolean).join("\n");
}

export function json(d: UsbDevice, withRaw = false) {
  const { raw, ...rest } = d;
  return JSON.stringify(withRaw ? { ...rest, raw } : rest, null, 2);
}
