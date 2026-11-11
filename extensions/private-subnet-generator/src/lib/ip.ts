import { randomBytes } from "node:crypto";

export type Family = 4 | 6;

export interface Prefix {
  family: Family;
  address: bigint;
  length: number;
}

const BITS: Record<Family, number> = { 4: 32, 6: 128 };

export function parsePrefix(cidr: string): Prefix {
  const [address, length] = cidr.split("/");
  const family: Family = address.includes(":") ? 6 : 4;
  return {
    family,
    address: family === 4 ? parseIPv4(address) : parseIPv6(address),
    length: Number(length),
  };
}

export function formatPrefix(prefix: Prefix): string {
  const address = prefix.family === 4 ? formatIPv4(prefix.address) : formatIPv6(prefix.address);
  return `${address}/${prefix.length}`;
}

export function overlaps(a: Prefix, b: Prefix): boolean {
  if (a.family !== b.family) return false;
  const length = Math.min(a.length, b.length);
  const mask = netmask(a.family, length);
  return (a.address & mask) === (b.address & mask);
}

export interface Block {
  family: Family;
  start: bigint;
  size: bigint;
}

export function parsePrefixLength(text: string): number | undefined {
  const match = /^\/?(\d{1,3})$/.exec(text.trim());
  return match ? Number(match[1]) : undefined;
}

export function randomSubnet(pools: Prefix[], length: number, avoid: Prefix[]): Prefix {
  const family = pools[0].family;
  if (!Number.isInteger(length) || length < 0 || length > BITS[family]) {
    throw new Error(`/${length} is not a valid IPv${family} prefix length`);
  }
  const fitting = pools.filter((pool) => pool.length <= length);
  if (fitting.length === 0) throw new Error(`No /${length} fits into ${pools.map(formatPrefix).join(", ")}`);

  const blocks = fitting.flatMap((pool) => freeBlocks(pool, length, avoid));
  const total = countSubnets(blocks);
  if (total === 0n) throw new Error(`Every /${length} in ${fitting.map(formatPrefix).join(", ")} is excluded`);
  let index = randomBigInt(total);
  for (const block of blocks) {
    if (index < block.size) {
      const address = (block.start + index) << BigInt(BITS[block.family] - length);
      return { family: block.family, address, length };
    }
    index -= block.size;
  }
  throw new Error("Subnet index out of range");
}

export function countSubnets(blocks: Block[]): bigint {
  return blocks.reduce((sum, block) => sum + block.size, 0n);
}

export function freeBlocks(pool: Prefix, length: number, avoid: Prefix[]): Block[] {
  const range = toBlock(pool, length);
  const end = range.start + range.size;
  const taken = avoid
    .filter((reserved) => overlaps(pool, reserved))
    .map((reserved) => toBlock(reserved, length))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  const free: Block[] = [];
  let cursor = range.start;
  for (const block of taken) {
    const start = block.start > range.start ? block.start : range.start;
    const stop = block.start + block.size < end ? block.start + block.size : end;
    if (start > cursor) free.push({ family: pool.family, start: cursor, size: start - cursor });
    if (stop > cursor) cursor = stop;
  }
  if (end > cursor) free.push({ family: pool.family, start: cursor, size: end - cursor });
  return free;
}

function toBlock(prefix: Prefix, length: number): Block {
  const covered = Math.min(prefix.length, length);
  const start = (prefix.address & netmask(prefix.family, covered)) >> BigInt(BITS[prefix.family] - length);
  return { family: prefix.family, start, size: 1n << BigInt(length - covered) };
}

function randomBigInt(limit: bigint): bigint {
  const bits = (limit - 1n).toString(2).length;
  const mask = (1n << BigInt(bits)) - 1n;
  for (;;) {
    const value = BigInt(`0x${randomBytes(Math.ceil(bits / 8)).toString("hex")}`) & mask;
    if (value < limit) return value;
  }
}

function netmask(family: Family, length: number): bigint {
  const bits = BITS[family];
  return ((1n << BigInt(length)) - 1n) << BigInt(bits - length);
}

function parseIPv4(address: string): bigint {
  return address.split(".").reduce((value, octet) => (value << 8n) | BigInt(octet), 0n);
}

function parseIPv6(address: string): bigint {
  const [head, tail] = address.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? headGroups
      : [...headGroups, ...Array(8 - headGroups.length - tailGroups.length).fill("0"), ...tailGroups];
  return groups.reduce((value, group) => (value << 16n) | BigInt(parseInt(group, 16)), 0n);
}

function formatIPv4(address: bigint): string {
  return [24n, 16n, 8n, 0n].map((shift) => ((address >> shift) & 0xffn).toString()).join(".");
}

function formatIPv6(address: bigint): string {
  const groups = Array.from({ length: 8 }, (_, i) => ((address >> BigInt(112 - 16 * i)) & 0xffffn).toString(16));

  let best = { start: 0, length: 0 };
  let run = { start: 0, length: 0 };
  groups.forEach((group, i) => {
    if (group !== "0") {
      run = { start: i + 1, length: 0 };
      return;
    }
    run.length++;
    if (run.length > best.length) best = { ...run };
  });

  if (best.length < 2) return groups.join(":");
  const head = groups.slice(0, best.start).join(":");
  const tail = groups.slice(best.start + best.length).join(":");
  return `${head}::${tail}`;
}
