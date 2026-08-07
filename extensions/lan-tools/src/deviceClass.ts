import type { Device, MDNSService } from "./types";
import { hapCategoryToClass } from "./mdns";

/**
 * Device-class heuristic, ported from the original Swift implementation.
 * Inputs: mDNS service types (the full advertised set), HomeKit category,
 * vendor (OUI), observed ports.
 */

/** Classify from the set of advertised mDNS service types. */
export function fromMDNSTypes(services: MDNSService[]): string | undefined {
  const types = services.map((s) => s.type).join(" ");
  // HomeKit category is the strongest single signal — use it first.
  for (const s of services) {
    if (s.category) {
      const c = hapCategoryToClass(s.category);
      if (c) return c;
    }
  }
  if (
    /_airplay|_raop|_sonos|_googlecast|_spotify-connect|_plexmediasvr|_tidalconnect|_qobuz-connect|_linkplay|_kef-info/.test(
      types,
    )
  )
    return "media";
  if (/_smb|_afpovertcp|_workstation/.test(types)) return "server";
  if (/_ipp|_ipps/.test(types)) return "printer";
  if (/_hap|_matter|_aqara|_meshcop/.test(types)) return "iot";
  if (/_apple-mobdev2|_companion-link/.test(types)) return "mobile";
  if (/_http|_https/.test(types)) return "device";
  if (/_ssh/.test(types)) return "server";
  return undefined;
}

/** Compat: classify from a single mDNS type string (kept for any legacy call). */
export function fromMDNS(type: string): string | undefined {
  return fromMDNSTypes([{ type }]);
}

export function fromVendor(vendor: string): string | undefined {
  const v = vendor.toLowerCase();
  if (
    /espressif|texas instruments|silicon lab|tuya|lumi united|aqara|shenzhen|xiaomi|yeelink|tcl/.test(
      v,
    )
  )
    return "iot";
  if (
    /synology|qnap|raspberry|asustor|gigabyte|super micro|intel corporate/.test(
      v,
    )
  )
    return "server";
  if (/plex|roku|sonos|nvidia|kef|linkplay/.test(v)) return "media";
  if (/apple/.test(v)) return "mobile";
  if (/microsoft|dell|lenovo|asus/.test(v)) return "desktop";
  if (/tp-link|netgear|linksys|ubiquiti|cisco|huawei|zte/.test(v))
    return "network";
  return undefined;
}

export function fromPorts(ports: number[]): string | undefined {
  const set = new Set(ports);
  if (set.has(445) || set.has(548)) return "server";
  if (set.has(32400) || set.has(8096)) return "media";
  if (set.has(22)) return "server";
  if (set.has(1883)) return "iot";
  return undefined;
}

export function computeClass(
  device: Device,
  mdnsType?: string,
): string | undefined {
  if (device.mdnsServices && device.mdnsServices.length > 0) {
    const c = fromMDNSTypes(device.mdnsServices);
    if (c) return c;
  }
  if (mdnsType) {
    const c = fromMDNS(mdnsType);
    if (c) return c;
  }
  if (device.vendor) {
    const c = fromVendor(device.vendor);
    if (c) return c;
  }
  if (device.snapshotPorts.length > 0) {
    const c = fromPorts(device.snapshotPorts);
    if (c) return c;
  }
  return undefined;
}
