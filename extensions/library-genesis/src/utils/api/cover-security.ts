import dns from "node:dns";
import type { LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";
import type { LookupFunction } from "node:net";
import { Agent } from "undici";

import { mirrors } from "./mirrors";

export class CoverSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoverSecurityError";
  }
}

const mirrorOrigins = new Set(mirrors.map(({ baseUrl }) => new URL(baseUrl).origin));

export const validateCoverUrl = (value: string, preferredMirror?: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CoverSecurityError("The cover URL is invalid.");
  }
  let preferredOrigin: string | undefined;
  try {
    preferredOrigin = preferredMirror ? new URL(preferredMirror).origin : undefined;
  } catch {
    // Invalid preferences never expand the allowed origins.
  }
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    isIP(url.hostname.replace(/^\[|\]$/g, "")) ||
    (!mirrorOrigins.has(url.origin) && url.origin !== preferredOrigin)
  ) {
    throw new CoverSecurityError("The cover URL is not on an allowed HTTPS mirror.");
  }
  return url;
};

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(address, prefix, "ipv4");
}
// Accept ordinary IPv6 global unicast; exclude special-use and tunnelling ranges.
const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
blocked.addSubnet("3fff::", 20, "ipv6");

export const isPublicCoverAddress = (address: string): boolean => {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) return globalIPv6.check(address, "ipv6") && !blocked.check(address, "ipv6");
  return false;
};

// Validate the DNS results supplied to the socket, avoiding a second unchecked lookup.
export const lookupCoverAddress: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) return callback(error, "", 0);
    if (
      !addresses.length ||
      addresses.some(({ address, family }) => isIP(address) !== family || !isPublicCoverAddress(address))
    ) {
      return callback(new CoverSecurityError("The cover host resolves to a private or reserved address."), "", 0);
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
};

export const coverDispatcher = new Agent({ connect: { lookup: lookupCoverAddress } });
