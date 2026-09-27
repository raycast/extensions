import { Color } from "@raycast/api";

import type { IpAddress, Scalar, Subnet } from "./types";

/** Stringify loose API values ("1", 1, null → "1", "1", ""). */
export function s(v: Scalar): string {
  return v === undefined || v === null ? "" : String(v);
}

/** Expand a compressed IPv6 address into its full 8-group form. */
export function expandIpv6(ip: string): string {
  const halves = ip.split("::");
  if (halves.length > 2) return ip;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = Math.max(0, 8 - head.length - tail.length);
  const groups = [...head, ...new Array(missing).fill("0"), ...tail].map((g) =>
    g.padStart(4, "0"),
  );
  return groups.join(":");
}

function stripGroup(g: string): string {
  return g.replace(/^0+(?=.)/, "");
}

/** Compress 32 hex digits into shortest IPv6 notation. */
function compressIpv6Hex(hex: string): string {
  const groups = hex.match(/.{4}/g) ?? [];
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  groups.forEach((g, i) => {
    if (parseInt(g, 16) === 0) {
      if (curLen === 0) curStart = i;
      curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curLen = 0;
    }
  });
  if (bestLen < 2) return groups.map(stripGroup).join(":");
  const left = groups.slice(0, bestStart).map(stripGroup).join(":");
  const right = groups
    .slice(bestStart + bestLen)
    .map(stripGroup)
    .join(":");
  return `${left}::${right}`;
}

/**
 * phpIPAM stores addresses as decimal integers and some endpoints return them
 * untransformed. Convert decimal values to dotted notation, pass through
 * anything that is already dotted. Values that fit in 32 bits are ambiguous
 * (::1 and 0.0.0.1 are both "1"), so the family must come from the parent
 * subnet when it is known; only values beyond the IPv4 range decide alone.
 */
export function dotted(v: Scalar, family?: 4 | 6): string {
  const str = s(v).trim();
  if (!str) return "";
  if (str.includes(":") || str.includes(".")) return str;
  if (!/^\d+$/.test(str)) return str;
  const n = BigInt(str);
  if (family === 6 || n > 0xffffffffn) {
    return compressIpv6Hex(n.toString(16).padStart(32, "0"));
  }
  return [24n, 16n, 8n, 0n]
    .map((shift) => String((n >> shift) & 0xffn))
    .join(".");
}

/** Numeric sort key so subnets and addresses order like they do in the UI. */
export function ipSortKey(ip: string): bigint {
  try {
    if (ip.includes(":")) {
      // IPv6 sits above the whole IPv4 range (which is < 2^32).
      return (1n << 128n) | BigInt("0x" + expandIpv6(ip).replace(/:/g, ""));
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
      return ip
        .split(".")
        .reduce<bigint>((acc, octet) => (acc << 8n) | BigInt(octet), 0n);
    }
  } catch {
    // fall through for malformed values
  }
  return 0n;
}

export function ipOf(address: IpAddress, family?: 4 | 6): string {
  return dotted(address.ip ?? address.ip_addr, family) || `#${s(address.id)}`;
}

/**
 * phpIPAM has no address-family column; the parent subnet decides it. A mask
 * above 32 only fits IPv6, and a subnet value beyond the IPv4 range must be
 * IPv6. (An IPv6 subnet of ::/N with N ≤ 32 would still be misread — no real
 * allocation looks like that.)
 */
export function subnetFamily(subnet: Subnet): 4 | 6 {
  const mask = Number(s(subnet.mask));
  if (Number.isFinite(mask) && mask > 32) return 6;
  return dotted(subnet.subnet).includes(":") ? 6 : 4;
}

export function subnetLabel(subnet: Subnet): string {
  if (s(subnet.isFolder) === "1") {
    return s(subnet.description) || "Folder";
  }
  const network = dotted(subnet.subnet, subnetFamily(subnet));
  return network ? `${network}/${s(subnet.mask)}` : `Subnet #${s(subnet.id)}`;
}

export function isFolder(subnet: Subnet): boolean {
  return s(subnet.isFolder) === "1";
}

export function sortSubnets(subnets: Subnet[]): Subnet[] {
  return [...subnets].sort((a, b) => {
    const folderDiff = Number(isFolder(a)) - Number(isFolder(b));
    if (folderDiff !== 0) return folderDiff;
    const keyA = ipSortKey(dotted(a.subnet, subnetFamily(a)));
    const keyB = ipSortKey(dotted(b.subnet, subnetFamily(b)));
    if (keyA !== keyB) return keyA < keyB ? -1 : 1;
    return subnetLabel(a).localeCompare(subnetLabel(b));
  });
}

export function sortAddresses(
  addresses: IpAddress[],
  family?: 4 | 6,
): IpAddress[] {
  return [...addresses].sort((a, b) => {
    const keyA = ipSortKey(ipOf(a, family));
    const keyB = ipSortKey(ipOf(b, family));
    return keyA === keyB
      ? ipOf(a, family).localeCompare(ipOf(b, family))
      : keyA < keyB
        ? -1
        : 1;
  });
}

/** Default phpIPAM address tags (see ipTags table in SCHEMA.sql). */
const TAG_NAMES: Record<string, string> = {
  "1": "Offline",
  "2": "Used",
  "3": "Reserved",
  "4": "DHCP",
};

const TAG_COLORS: Record<string, Color> = {
  "1": Color.Red,
  "2": Color.Green,
  "3": Color.Blue,
  "4": Color.SecondaryText,
};

export function tagName(state: string): string {
  if (!state) return "";
  return TAG_NAMES[state] ?? `Tag ${state}`;
}

export function tagColor(state: string): Color {
  return TAG_COLORS[state] ?? Color.PrimaryText;
}

const numberFormat = new Intl.NumberFormat();

export function fmtNum(v: Scalar): string {
  const n = Number(v);
  return Number.isFinite(n) ? numberFormat.format(n) : s(v);
}

export function fmtPct(v: Scalar): string {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "";
}
