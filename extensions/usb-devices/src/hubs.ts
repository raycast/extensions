import type { UsbDevice } from "./usb";

/**
 * Every USB 3 hub enumerates twice: a USB 2 hub (for Low/Full/High-speed devices) and a USB 3 hub
 * (for SuperSpeed devices). This pairs those halves so a monitor or dock reads as one hub.
 *
 * Pairing is deliberately conservative: one USB 2 and one SuperSpeed hub, matched uniquely, by location
 * path first (see locTail) and by vendor + paired parent as a fallback. Anything ambiguous stays separate.
 */
export interface HubPairing {
  /** Maps any device key to the key of the hub group it belongs to (itself if unpaired). */
  canon: (key?: string) => string | undefined;
  /** USB 2 half for a SuperSpeed primary, if paired. */
  twinOf: (key: string) => UsbDevice | undefined;
}

const isSuperSpeed = (d: UsbDevice) =>
  (d.speedCode !== undefined && d.speedCode >= 3) || (d.linkBps !== undefined && d.linkBps >= 4e9);

/**
 * Location IDs are 0xBBPPPPPP: bus byte, then one nibble per port along the path. The USB 2 and USB 3
 * halves of a hub sit on different root ports (first nibble) but have identical paths below that,
 * e.g. 0x01143000 ↔ 0x01243000. This is the strongest pairing signal and doesn't need matching vendors
 * (many hubs report different vendor IDs for their two halves).
 */
const locTail = (d: UsbDevice) =>
  d.locationId === undefined
    ? undefined
    : `${(d.locationId >>> 24) & 0xff}:${(d.locationId & 0x000fffff).toString(16)}:${d.depth}`;

export function pairHubs(devices: UsbDevice[]): HubPairing {
  const merged = new Map<string, string>(); // USB 2 half key → SuperSpeed half key
  const byKey = new Map(devices.map((d) => [d.key, d]));
  const canon = (key?: string) => (key === undefined ? undefined : (merged.get(key) ?? key));
  const hubs = devices.filter((d) => d.isHub);
  const childHubs = (h: UsbDevice) => hubs.filter((x) => x.parentKey === h.key);

  // Pass 1: location-path match. At the root (depth 0), different root ports on a shared bus could
  // hold unrelated hubs, so there we also want the same vendor, or child hubs that match by path too.
  const byTail = new Map<string, UsbDevice[]>();
  for (const h of hubs) {
    const t = locTail(h);
    if (t) byTail.set(t, [...(byTail.get(t) ?? []), h]);
  }
  for (const list of byTail.values()) {
    const ss = list.filter(isSuperSpeed);
    const hs = list.filter((h) => !isSuperSpeed(h));
    if (ss.length !== 1 || hs.length !== 1) continue;
    const [s, h] = [ss[0], hs[0]];
    const confirmed =
      s.depth > 0 ||
      s.vendorId === h.vendorId ||
      childHubs(h).some((hc) => childHubs(s).some((sc) => locTail(sc) === locTail(hc)));
    if (confirmed) merged.set(h.key, s.key);
  }

  // Pass 2 (fallback for hubs without usable location IDs): same vendor + same paired parent, unique.
  const depths = [...new Set(hubs.map((h) => h.depth))].sort((a, b) => a - b);
  const taken = () => new Set([...merged.keys(), ...merged.values()]);
  for (const depth of depths) {
    const used = taken();
    const buckets = new Map<string, UsbDevice[]>();
    for (const h of hubs.filter((x) => x.depth === depth && !used.has(x.key) && x.locationId === undefined)) {
      const upstream = h.parentKey ? `p:${canon(h.parentKey)}` : `root:${h.controller}`;
      const k = `${h.vendorId ?? "?"}|${h.builtIn}|${upstream}`;
      buckets.set(k, [...(buckets.get(k) ?? []), h]);
    }
    for (const list of buckets.values()) {
      const ss = list.filter(isSuperSpeed);
      const hs = list.filter((h) => !isSuperSpeed(h));
      if (ss.length === 1 && hs.length === 1) merged.set(hs[0].key, ss[0].key);
    }
  }

  const twins = new Map<string, UsbDevice>();
  for (const [hsKey, ssKey] of merged) {
    const hs = byKey.get(hsKey);
    if (hs) twins.set(ssKey, hs);
  }
  return { canon, twinOf: (key) => twins.get(key) };
}
