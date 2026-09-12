import { execFile } from "node:child_process";
import net from "node:net";
import os from "node:os";
import { promisify } from "node:util";

export interface NetworkAddress {
  interfaceName: string;
  address: string;
  netmask?: string;
}

const MAX_SUBNET_HOSTS = 65_534;
const execFileAsync = promisify(execFile);

export function listScanAddresses(includeVirtual: boolean): NetworkAddress[] {
  const results: NetworkAddress[] = [];
  for (const [interfaceName, addresses] of Object.entries(os.networkInterfaces())) {
    if (!addresses) continue;
    if (!includeVirtual && !/^en\d+$/.test(interfaceName)) continue;
    if (/^(lo|awdl|llw)/.test(interfaceName)) continue;

    for (const address of addresses) {
      if (address.family !== "IPv4" || address.internal || !isPrivateIPv4(address.address, includeVirtual)) continue;
      results.push({ interfaceName, address: address.address, netmask: address.netmask });
    }
  }

  return results.sort((left, right) => interfacePriority(left.interfaceName) - interfacePriority(right.interfaceName));
}

export function subnetCandidates(addresses: NetworkAddress[]): string[] {
  const candidates = new Set<string>();
  for (const { address, netmask } of addresses) {
    const addressValue = ipv4ToNumber(address);
    const maskValue = ipv4ToNumber(netmask || "255.255.255.0");
    if (addressValue === undefined || maskValue === undefined || !isContiguousNetmask(maskValue)) continue;

    const hostCount = (~maskValue >>> 0) - 1;
    const effectiveMask = hostCount <= MAX_SUBNET_HOSTS ? maskValue : 0xffffff00;
    const network = (addressValue & effectiveMask) >>> 0;
    const broadcast = (network | (~effectiveMask >>> 0)) >>> 0;
    for (let candidate = network + 1; candidate < broadcast; candidate += 1) {
      if (candidate === addressValue) continue;
      candidates.add(numberToIPv4(candidate));
    }
  }
  return [...candidates];
}

export async function neighborCandidates(addresses: NetworkAddress[]): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/arp", ["-an"], { timeout: 1_000 });
    const interfaces = new Set(addresses.map(({ interfaceName }) => interfaceName));
    const ownAddresses = new Set(addresses.map(({ address }) => address));
    const candidates = new Set<string>();
    for (const line of stdout.split("\n")) {
      if (line.includes("(incomplete)")) continue;
      const match = line.match(/\((\d{1,3}(?:\.\d{1,3}){3})\).*\bon\s+(\S+)/);
      if (!match || !interfaces.has(match[2]) || ownAddresses.has(match[1]) || !isPrivateIPv4(match[1], true)) continue;
      candidates.add(match[1]);
    }
    return [...candidates];
  } catch {
    return [];
  }
}

export async function openPortCandidates(
  addresses: string[],
  port = 8085,
  timeoutMs = 180,
  concurrency = 512
): Promise<string[]> {
  const openAddresses: string[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < addresses.length) {
      const address = addresses[cursor];
      cursor += 1;
      if (await isPortOpen(address, port, timeoutMs)) openAddresses.push(address);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, addresses.length) }, () => worker()));
  return openAddresses;
}

export function isPrivateIPv4(address: string, includeCarrierGradeNat = false): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return includeCarrierGradeNat && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

function interfacePriority(name: string): number {
  if (name === "en0") return 0;
  if (/^en\d+$/.test(name)) return 1;
  if (/^bridge/.test(name)) return 2;
  if (/^utun/.test(name)) return 3;
  return 4;
}

function ipv4ToNumber(address: string): number | undefined {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return undefined;
  }
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function numberToIPv4(value: number): string {
  return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join(".");
}

function isContiguousNetmask(mask: number): boolean {
  const inverted = ~mask >>> 0;
  return (inverted & (inverted + 1)) === 0;
}

function isPortOpen(address: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: address, port });
    let settled = false;
    const finish = (open: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}
