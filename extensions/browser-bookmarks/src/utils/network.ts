import { isIP } from "net";

const LOCAL_HOSTNAME_SUFFIXES = [".local", ".localhost", ".internal", ".lan", ".home", ".home.arpa"];

function isPrivateIPv4(address: string) {
  const [first, second] = address.split(".").map(Number);
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIPv6(address: string) {
  const mappedIPv4 = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1] ?? getHexMappedIPv4(address);
  if (mappedIPv4) return isPrivateIPv4(mappedIPv4);

  const firstGroup = Number.parseInt(address.split(":", 1)[0] || "0", 16);
  return address === "::" || address === "::1" || (firstGroup & 0xfe00) === 0xfc00 || (firstGroup & 0xffc0) === 0xfe80;
}

function getHexMappedIPv4(address: string) {
  const match = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!match) return undefined;

  const high = Number.parseInt(match[1], 16);
  const low = Number.parseInt(match[2], 16);
  return `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
}

export function isPrivateHostname(hostname: string) {
  const normalizedHostname = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  const ipVersion = isIP(normalizedHostname);
  if (ipVersion === 4) return isPrivateIPv4(normalizedHostname);
  if (ipVersion === 6) return isPrivateIPv6(normalizedHostname);

  return (
    normalizedHostname === "localhost" ||
    !normalizedHostname.includes(".") ||
    LOCAL_HOSTNAME_SUFFIXES.some((suffix) => normalizedHostname.endsWith(suffix))
  );
}
