/**
 * Dependency-free IPv4 + IPv6 subnet math.
 *
 * Everything is done on BigInt so IPv4 (32 bit) and IPv6 (128 bit) share one
 * code path and /0 on IPv6 (2^128 addresses) stays exact.
 */

export type IPVersion = 4 | 6;

export const V4_BITS = 32;
export const V6_BITS = 128;

export interface Subnet {
  version: IPVersion;
  /** 32 for IPv4, 128 for IPv6. */
  bits: number;
  /** Prefix length, 0..bits. */
  prefix: number;
  /** First address of the block, host bits cleared. */
  network: bigint;
  /** The address exactly as typed, before masking. */
  address: bigint;
  /** True when the typed address had bits set below the prefix. */
  hasHostBits: boolean;
}

export interface SubnetInfo extends Subnet {
  /** Normalised `network/prefix`. */
  cidr: string;
  networkText: string;
  /** Last address of the block (broadcast on IPv4). */
  last: bigint;
  lastText: string;
  /** The address as typed, formatted. */
  addressText: string;
  /** Number of addresses in the block. */
  size: bigint;
  hostBits: number;
  /** IPv4 only. */
  netmask?: string;
}

/* -------------------------------------------------------------------------- */
/* parsing                                                                    */
/* -------------------------------------------------------------------------- */

export function parseIPv4(text: string): bigint | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;

  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    // Reject leading zeros: "010" is ambiguous (octal in some tools).
    if (part.length > 1 && part.startsWith("0")) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value << 8n) | BigInt(octet);
  }
  return value;
}

function parseGroups(text: string): number[] | null {
  if (text === "") return [];

  const raw = text.split(":");
  const groups: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const group = raw[i];
    if (group.includes(".")) {
      // Embedded IPv4, only legal as the final 32 bits (e.g. ::ffff:192.0.2.1).
      if (i !== raw.length - 1) return null;
      const v4 = parseIPv4(group);
      if (v4 === null) return null;
      groups.push(Number(v4 >> 16n), Number(v4 & 0xffffn));
      continue;
    }
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    groups.push(parseInt(group, 16));
  }
  return groups;
}

export function parseIPv6(input: string): bigint | null {
  // Drop a zone id such as %en0.
  const zone = input.indexOf("%");
  const text = zone === -1 ? input : input.slice(0, zone);
  if (text === "") return null;

  const halves = text.split("::");
  if (halves.length > 2) return null;

  let groups: number[];
  if (halves.length === 1) {
    const parsed = parseGroups(text);
    if (!parsed || parsed.length !== 8) return null;
    groups = parsed;
  } else {
    const head = parseGroups(halves[0]);
    const tail = parseGroups(halves[1]);
    if (!head || !tail) return null;
    // "::" stands for at least one group of zeros.
    if (head.length + tail.length > 7) return null;
    groups = [...head, ...new Array(8 - head.length - tail.length).fill(0), ...tail];
  }

  let value = 0n;
  for (const group of groups) value = (value << 16n) | BigInt(group);
  return value;
}

export function parseAddress(text: string): { value: bigint; version: IPVersion } | null {
  if (text.includes(":")) {
    const value = parseIPv6(text);
    return value === null ? null : { value, version: 6 };
  }
  const value = parseIPv4(text);
  return value === null ? null : { value, version: 4 };
}

/** Prefix length of a contiguous dotted netmask, or null if it has holes. */
export function prefixFromMask(mask: bigint, bits: number): number | null {
  for (let prefix = 0; prefix <= bits; prefix++) {
    if (maskFor(prefix, bits) === mask) return prefix;
  }
  return null;
}

/**
 * Accepts `10.0.0.0/16`, `10.0.0.0/255.255.0.0`, `2001:db8::/32`,
 * a bare address (treated as /32 or /128) and addresses with host bits set.
 */
export function parseSubnet(input: string): Subnet | null {
  const text = input.trim();
  if (text === "") return null;

  const slash = text.indexOf("/");
  const addressText = (slash === -1 ? text : text.slice(0, slash)).trim();
  const prefixText = (slash === -1 ? "" : text.slice(slash + 1)).trim();

  const parsed = parseAddress(addressText);
  if (!parsed) return null;
  const bits = parsed.version === 4 ? V4_BITS : V6_BITS;

  let prefix: number;
  if (prefixText === "") {
    prefix = bits;
  } else if (/^\d{1,3}$/.test(prefixText)) {
    prefix = Number(prefixText);
    if (prefix > bits) return null;
  } else if (parsed.version === 4) {
    const mask = parseIPv4(prefixText);
    if (mask === null) return null;
    const fromMask = prefixFromMask(mask, bits);
    if (fromMask === null) return null;
    prefix = fromMask;
  } else {
    return null;
  }

  const network = parsed.value & maskFor(prefix, bits);
  return {
    version: parsed.version,
    bits,
    prefix,
    network,
    address: parsed.value,
    hasHostBits: network !== parsed.value,
  };
}

/* -------------------------------------------------------------------------- */
/* formatting                                                                 */
/* -------------------------------------------------------------------------- */

export function formatIPv4(value: bigint): string {
  return [24n, 16n, 8n, 0n].map((shift) => String((value >> shift) & 0xffn)).join(".");
}

/** RFC 5952: lowercase, no leading zeros, longest run of zero groups collapsed. */
export function formatIPv6(value: bigint): string {
  const groups: number[] = [];
  for (let i = 7; i >= 0; i--) groups.push(Number((value >> BigInt(i * 16)) & 0xffffn));

  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  let runLength = 0;
  groups.forEach((group, index) => {
    if (group === 0) {
      if (runStart === -1) runStart = index;
      runLength++;
      if (runLength > bestLength) {
        bestStart = runStart;
        bestLength = runLength;
      }
    } else {
      runStart = -1;
      runLength = 0;
    }
  });

  const hex = groups.map((group) => group.toString(16));
  if (bestLength < 2) return hex.join(":");
  return `${hex.slice(0, bestStart).join(":")}::${hex.slice(bestStart + bestLength).join(":")}`;
}

export function formatAddress(value: bigint, version: IPVersion): string {
  return version === 4 ? formatIPv4(value) : formatIPv6(value);
}

export function toCidr(subnet: Subnet): string {
  return `${formatAddress(subnet.network, subnet.version)}/${subnet.prefix}`;
}

/** Locale-grouped digits, plus a 2^n hint once the number stops being readable. */
export function formatCount(count: bigint, hostBits: number): string {
  const grouped = count.toLocaleString("en-US");
  return hostBits > 32 ? `2^${hostBits} (${grouped})` : grouped;
}

/* -------------------------------------------------------------------------- */
/* math                                                                       */
/* -------------------------------------------------------------------------- */

export function maskFor(prefix: number, bits: number): bigint {
  if (prefix <= 0) return 0n;
  return ((1n << BigInt(prefix)) - 1n) << BigInt(bits - prefix);
}

export function maxValue(bits: number): bigint {
  return (1n << BigInt(bits)) - 1n;
}

export function sizeOf(subnet: Subnet): bigint {
  return 1n << BigInt(subnet.bits - subnet.prefix);
}

export function lastAddress(subnet: Subnet): bigint {
  return subnet.network | (~maskFor(subnet.prefix, subnet.bits) & maxValue(subnet.bits));
}

function at(network: bigint, prefix: number, subnet: Subnet): Subnet {
  return {
    version: subnet.version,
    bits: subnet.bits,
    prefix,
    network,
    address: network,
    hasHostBits: false,
  };
}

/** The two halves one bit deeper, or null for a single-address block. */
export function splitInTwo(subnet: Subnet): [Subnet, Subnet] | null {
  if (subnet.prefix >= subnet.bits) return null;
  const prefix = subnet.prefix + 1;
  const half = 1n << BigInt(subnet.bits - prefix);
  return [at(subnet.network, prefix, subnet), at(subnet.network + half, prefix, subnet)];
}

/** Adjacent block of the same size after this one, or null at the end of the space. */
export function nextSubnet(subnet: Subnet): Subnet | null {
  const network = subnet.network + sizeOf(subnet);
  if (network > maxValue(subnet.bits)) return null;
  return at(network, subnet.prefix, subnet);
}

/** Adjacent block of the same size before this one, or null at the start. */
export function previousSubnet(subnet: Subnet): Subnet | null {
  const network = subnet.network - sizeOf(subnet);
  if (network < 0n) return null;
  return at(network, subnet.prefix, subnet);
}

/** The block one bit wider that contains this one, or null at /0. */
export function supernet(subnet: Subnet): Subnet | null {
  if (subnet.prefix <= 0) return null;
  const prefix = subnet.prefix - 1;
  return at(subnet.network & maskFor(prefix, subnet.bits), prefix, subnet);
}

/** True when `inner` fits entirely inside `outer`. */
export function contains(outer: Subnet, inner: Subnet): boolean {
  if (outer.version !== inner.version) return false;
  if (inner.prefix < outer.prefix) return false;
  return (inner.network & maskFor(outer.prefix, outer.bits)) === outer.network;
}

/* -------------------------------------------------------------------------- */
/* the one function the UI calls                                              */
/* -------------------------------------------------------------------------- */

export function describe(input: string): SubnetInfo | null {
  const subnet = parseSubnet(input);
  if (!subnet) return null;

  const last = lastAddress(subnet);
  const size = sizeOf(subnet);
  const hostBits = subnet.bits - subnet.prefix;

  const info: SubnetInfo = {
    ...subnet,
    cidr: toCidr(subnet),
    networkText: formatAddress(subnet.network, subnet.version),
    last,
    lastText: formatAddress(last, subnet.version),
    addressText: formatAddress(subnet.address, subnet.version),
    size,
    hostBits,
  };

  if (subnet.version === 4) {
    info.netmask = formatIPv4(maskFor(subnet.prefix, subnet.bits));
  }

  return info;
}

/** Plain-text dump of everything, for the "Copy Summary" action. */
export function summary(info: SubnetInfo): string {
  const lines = [
    `Subnet:      ${info.cidr}`,
    `Network:     ${info.networkText}`,
    `Range:       ${info.networkText} - ${info.lastText}`,
    `Prefix:      /${info.prefix}`,
    `Addresses:   ${formatCount(info.size, info.hostBits)}`,
  ];
  if (info.netmask) lines.push(`Netmask:     ${info.netmask}`);
  lines.push(`Version:     IPv${info.version}`);
  return lines.join("\n");
}
