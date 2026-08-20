// Ported from MyIP's `common/valid-ip.js` so both projects agree on what counts as an
// address worth sending to an external service.

export function isValidIP(ip: string): boolean {
  if (typeof ip !== "string") return false;

  const address = stripZone(ip);

  if (IPV4_PATTERN.test(address)) return true;

  const doubleColonParts = address.split("::");
  if (doubleColonParts.length > 2) return false;

  const hasCompressedGroup = doubleColonParts.length === 2;
  const groups = doubleColonParts.flatMap((part) => (part === "" ? [] : part.split(":")));

  // An IPv4-mapped or IPv4-embedded tail ("::ffff:192.0.2.1") is a dotted quad in the last
  // group, standing in for two hextets (RFC 4291 §2.5.5). It must sit in the final 32 bits:
  // after splitting on "::" the dotted quad can end up last in `groups` even when the
  // address really ends with "::" ("192.0.2.1::"), so also check it ends the address.
  let hextetCount = groups.length;
  const lastGroup = groups[groups.length - 1];
  if (lastGroup !== undefined && lastGroup.includes(".")) {
    if (!address.endsWith(lastGroup) || !IPV4_PATTERN.test(lastGroup)) return false;
    groups.pop();
    hextetCount += 1;
  }

  if (groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return false;

  return hasCompressedGroup ? hextetCount < 8 : hextetCount === 8;
}

/** The ':' separator only exists in v6. Does not validate — run isValidIP first. */
export function isIPv6(ip: string): boolean {
  return ip.includes(":");
}

/**
 * Name the reserved block an address belongs to, or undefined when it is publicly
 * routable. Used both to skip pointless lookups and to explain why one was skipped.
 */
export function describeReservedIP(ip: string): string | undefined {
  if (!isValidIP(ip)) return undefined;
  const address = stripZone(ip);
  return isIPv6(address) ? describeReservedV6(address) : describeReservedV4(address);
}

/**
 * Whether an IP is one an external service can actually answer about: well-formed and
 * inside publicly routable space.
 */
export function isUsablePublicIP(ip: string): boolean {
  return isValidIP(ip) && describeReservedIP(ip) === undefined;
}

const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// IPv4 blocks outside publicly routable space: the RFC 1918 private ranges plus loopback,
// link-local, CGNAT, documentation, benchmarking, multicast and the reserved tail.
const RESERVED_V4: [network: string, bits: number, label: string][] = [
  ["0.0.0.0", 8, "This network (RFC 1122)"],
  ["10.0.0.0", 8, "Private network (RFC 1918)"],
  ["100.64.0.0", 10, "Carrier-grade NAT (RFC 6598)"],
  ["127.0.0.0", 8, "Loopback (RFC 1122)"],
  ["169.254.0.0", 16, "Link-local (RFC 3927)"],
  ["172.16.0.0", 12, "Private network (RFC 1918)"],
  ["192.0.0.0", 24, "IETF protocol assignments (RFC 6890)"],
  ["192.0.2.0", 24, "Documentation, TEST-NET-1 (RFC 5737)"],
  ["192.88.99.0", 24, "6to4 relay anycast (RFC 3068)"],
  ["192.168.0.0", 16, "Private network (RFC 1918)"],
  ["198.18.0.0", 15, "Benchmarking (RFC 2544)"],
  ["198.51.100.0", 24, "Documentation, TEST-NET-2 (RFC 5737)"],
  ["203.0.113.0", 24, "Documentation, TEST-NET-3 (RFC 5737)"],
  ["224.0.0.0", 4, "Multicast (RFC 5771)"],
  ["240.0.0.0", 4, "Reserved (RFC 1112)"],
];

// Multiplication rather than `<<` — a 32-bit shift on 240.0.0.0 would go negative.
function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((total, octet) => total * 256 + Number(octet), 0);
}

function describeReservedV4(ip: string): string | undefined {
  const address = ipv4ToInt(ip);
  const match = RESERVED_V4.find(([network, bits]) => {
    const base = ipv4ToInt(network);
    return address >= base && address < base + 2 ** (32 - bits);
  });
  return match?.[2];
}

/**
 * The leading hextets as numbers. Only the first two matter here, and `::` compression
 * always elides a run starting right after the left-hand groups — so any index past them
 * reads as 0, which is what the elided groups hold.
 */
function leadingHextets(ip: string): [number, number] {
  const left = ip.split("::")[0];
  const groups = left === "" ? [] : left.split(":");
  return [0, 1].map((index) => (groups[index] === undefined ? 0 : parseInt(groups[index], 16))) as [number, number];
}

/**
 * IANA hands out global unicast IPv6 only from 2000::/3, so the question reduces to
 * "outside that range, or inside one of its carve-outs". Enumerating reserved prefixes
 * instead would leave holes — everything from 4000:: to fbff:: is unassigned, and new
 * blocks keep landing inside 2000::/3 (3fff::/20 became documentation space in 2024).
 */
function describeReservedV6(ip: string): string | undefined {
  const address = ip.toLowerCase();
  const [h0, h1] = leadingHextets(address);

  if (h0 >= 0x2000 && h0 <= 0x3fff) {
    if (h0 === 0x2001 && h1 === 0x0000) return "Teredo (RFC 4380)";
    if (h0 === 0x2001 && h1 >= 0x0020 && h1 <= 0x002f) return "ORCHIDv2 (RFC 7343)";
    if (h0 === 0x2001 && h1 === 0x0db8) return "Documentation (RFC 3849)";
    if (h0 === 0x2002) return "6to4 (RFC 3056)";
    if (h0 === 0x3fff && h1 <= 0x0fff) return "Documentation (RFC 9637)";
    return undefined;
  }

  if (address === "::1") return "Loopback (RFC 4291)";
  if (address === "::") return "Unspecified (RFC 4291)";
  if (/^::ffff:/i.test(address)) return "IPv4-mapped (RFC 4291)";
  if (h0 >= 0xfe80 && h0 <= 0xfebf) return "Link-local (RFC 4291)";
  if (h0 >= 0xfc00 && h0 <= 0xfdff) return "Unique local (RFC 4193)";
  if (h0 >= 0xff00) return "Multicast (RFC 4291)";
  return "Not global unicast (outside 2000::/3)";
}

/** Interface scope ids (fe80::1%en0) are a local annotation, not part of the address. */
function stripZone(ip: string): string {
  return ip.split("%")[0];
}
