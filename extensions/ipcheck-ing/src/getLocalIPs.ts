import { networkInterfaces, NetworkInterfaceInfo } from "os";

interface IPDetail {
  address: string;
  interface: string;
}

// Get Local IPs
export function getLocalIPs(): { ipv4: IPDetail[]; ipv6: IPDetail[] } {
  const ips: { ipv4: IPDetail[]; ipv6: IPDetail[] } = { ipv4: [], ipv6: [] };
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const networks: NetworkInterfaceInfo[] = nets[name] || []; // 增加了 `|| []` 以处理可能为 undefined 的情况
    for (const net of networks) {
      if (!net.internal) {
        if (net.family === "IPv4") {
          ips.ipv4.push({ address: net.address, interface: name });
        } else if (net.family === "IPv6") {
          if (!net.address.startsWith("fe80") && !/^(fc|fd)/.test(net.address)) {
            ips.ipv6.push({ address: net.address, interface: name });
          }
        }
      }
    }
  }
  return ips;
}

// Check if IP is local
export function isLocalIPAddress(ip: string): boolean {
  // IPv4 Local Address
  const localIPv4Ranges: { start: string; end: string }[] = [
    { start: "10.0.0.0", end: "10.255.255.255" },
    { start: "172.16.0.0", end: "172.31.255.255" },
    { start: "192.168.0.0", end: "192.168.255.255" },
    { start: "169.254.0.0", end: "169.254.255.255" },
    { start: "198.18.0.0", end: "198.19.255.255" },
  ];

  // IPv6 Local Address
  const localIPv6Ranges: { start: string; bits: number }[] = [
    { start: "fc00::", bits: 7 },
    { start: "fe80::", bits: 10 },
    { start: "::1", bits: 128 },
  ];

  if (ip.includes(".")) {
    const ipNum = ipToNumberIPv4(ip);
    if (ipNum === null) return false;

    return localIPv4Ranges.some((range) => {
      const startNum = ipToNumberIPv4(range.start);
      const endNum = ipToNumberIPv4(range.end);
      return startNum !== null && endNum !== null && ipNum >= startNum && ipNum <= endNum;
    });
  } else if (ip.includes(":")) {
    return localIPv6Ranges.some((range) => isIPv6InRange(ip, range.start, range.bits));
  }

  return false;
}

function ipToNumberIPv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = num * 256 + n;
  }
  return num;
}

function isIPv6InRange(ip: string, rangeStart: string, bits: number): boolean {
  const ipNum = ipToBigIntIPv6(ip);
  const rangeStartNum = ipToBigIntIPv6(rangeStart);
  if (ipNum === null || rangeStartNum === null) return false;

  const mask = BigInt(-1) << BigInt(128 - bits);
  return (ipNum & mask) === (rangeStartNum & mask);
}

function ipToBigIntIPv6(ip: string): bigint | null {
  let parts: string[];
  if (ip.includes("::")) {
    const [start, end] = ip.split("::");
    const startParts = start ? start.split(":") : [];
    const endParts = end ? end.split(":") : [];
    const missing = 8 - startParts.length - endParts.length;
    parts = [...startParts, ...Array(missing).fill("0"), ...endParts];
  } else {
    parts = ip.split(":");
  }

  if (parts.length !== 8) return null;

  try {
    return parts.reduce<bigint>((num, part) => {
      const value = parseInt(part, 16);
      if (isNaN(value)) throw new Error("Invalid IP segment");
      return (num << BigInt(16)) + BigInt(value);
    }, BigInt(0));
  } catch (error) {
    return null;
  }
}
