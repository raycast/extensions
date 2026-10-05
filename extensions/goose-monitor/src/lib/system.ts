import os from "node:os";
import { run } from "./exec";

/* 整机 CPU / 内存 / 压力。菜单栏用：CPU 用 os.cpus() 累计 tick 做区间差，
   内存口径对齐 Activity Monitor / iStat（exelban/Stats 同公式）。 */

export interface CpuTicks {
  user: number;
  nice: number;
  sys: number;
  idle: number;
  irq: number;
}

/** 一段采样里用户 / 系统 / 合计占用，均为 0–1。 */
export interface CpuSplit {
  used: number;
  user: number;
  sys: number;
}

export interface MemoryBreakdown {
  totalBytes: number;
  appBytes: number;
  wiredBytes: number;
  compressedBytes: number;
  availableBytes: number;
  cachedBytes: number;
  usedBytes: number;
  usedRatio: number;
  pageins: number;
  pageouts: number;
  pageSize: number;
}

export interface SystemRaw {
  cpuTicks: CpuTicks;
  coreTicks: CpuTicks[];
  /** Darwin 通常性能核在前。 */
  pCount: number;
  eCount: number;
  sampledAt: number;
  memory: MemoryBreakdown;
  swapUsedBytes: number;
  swapTotalBytes: number;
  /** 0–1；memory_pressure 解析失败则为 undefined。 */
  pressureRatio: number | undefined;
  /** kern.memorystatus_vm_pressure_level：1 正常 / 2 警告 / 4 危急。 */
  pressureLevel: number;
}

const PAGE_SIZE_RE = /page size of (\d+) bytes/i;
const VM_LINE_RE = /^"?([^:"]+)"?:\s+(\d+)\.?/;
const SWAP_USED_RE = /used\s*=\s*([\d.]+)([KMG])/i;
const SWAP_TOTAL_RE = /total\s*=\s*([\d.]+)([KMG])/i;
const FREE_PCT_RE = /System-wide memory free percentage:\s+(\d+)%/;

let inFlight: Promise<SystemRaw> | undefined;
let perfCache: { pCount: number; eCount: number } | undefined;

export function readCpuTicks(): CpuTicks {
  return sumTicks(readCoreTicks());
}

export function readCoreTicks(): CpuTicks[] {
  return os.cpus().map((cpu) => ({
    user: cpu.times.user,
    nice: cpu.times.nice,
    sys: cpu.times.sys,
    idle: cpu.times.idle,
    irq: cpu.times.irq,
  }));
}

export function sumTicks(cores: readonly CpuTicks[]): CpuTicks {
  const sum: CpuTicks = { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
  for (const cpu of cores) {
    sum.user += cpu.user;
    sum.nice += cpu.nice;
    sum.sys += cpu.sys;
    sum.idle += cpu.idle;
    sum.irq += cpu.irq;
  }
  return sum;
}

export function cpuSplit(prev: CpuTicks, curr: CpuTicks): CpuSplit | undefined {
  const dUser = curr.user - prev.user;
  const dNice = curr.nice - prev.nice;
  const dSys = curr.sys - prev.sys;
  const dIdle = curr.idle - prev.idle;
  const dIrq = curr.irq - prev.irq;
  const total = dUser + dNice + dSys + dIdle + dIrq;
  if (total <= 0) return undefined;
  return {
    used: clamp01(1 - dIdle / total),
    user: clamp01((dUser + dNice) / total),
    sys: clamp01((dSys + dIrq) / total),
  };
}

/** 区间占用 0–1；tick 未前进时返回 undefined。 */
export function cpuRatio(prev: CpuTicks, curr: CpuTicks): number | undefined {
  return cpuSplit(prev, curr)?.used;
}

export function coreUsedList(prev: readonly CpuTicks[], curr: readonly CpuTicks[]): number[] {
  const n = Math.min(prev.length, curr.length);
  const used: number[] = [];
  for (let i = 0; i < n; i++) {
    const split = cpuSplit(prev[i]!, curr[i]!);
    used.push(split?.used ?? 0);
  }
  return used;
}

export function parsePerfLevelCounts(pOut: string, eOut: string): { pCount: number; eCount: number } {
  const pCount = Math.max(0, Math.floor(Number(pOut.trim()) || 0));
  const eCount = Math.max(0, Math.floor(Number(eOut.trim()) || 0));
  return { pCount, eCount };
}

export function splitPAndE(used: readonly number[], pCount: number): { p: number[]; e: number[] } {
  if (!(pCount > 0) || pCount >= used.length) return { p: [...used], e: [] };
  return { p: used.slice(0, pCount), e: used.slice(pCount) };
}

export function meanRatio(values: readonly number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function parseVmStat(text: string): { pageSize: number; pages: Record<string, number> } {
  const pageSize = Number(PAGE_SIZE_RE.exec(text)?.[1] ?? 4096);
  const pages: Record<string, number> = {};
  for (const line of text.split("\n")) {
    const match = VM_LINE_RE.exec(line.trim());
    if (match) pages[match[1]] = Number(match[2]);
  }
  return { pageSize, pages };
}

/** App / Wired / Compressed / Available，used = 前三项之和。 */
export function composeMemory(totalBytes: number, pageSize: number, pages: Record<string, number>): MemoryBreakdown {
  const bytes = (key: string) => (pages[key] ?? 0) * pageSize;
  const wired = bytes("Pages wired down");
  const compressed = bytes("Pages occupied by compressor");
  const used = Math.max(
    0,
    bytes("Pages active") +
      bytes("Pages inactive") +
      bytes("Pages speculative") +
      wired +
      compressed -
      bytes("Pages purgeable") -
      bytes("File-backed pages"),
  );
  const app = Math.max(0, used - wired - compressed);
  return {
    totalBytes,
    appBytes: app,
    wiredBytes: wired,
    compressedBytes: compressed,
    availableBytes: Math.max(0, totalBytes - used),
    cachedBytes: bytes("Pages purgeable") + bytes("File-backed pages"),
    usedBytes: used,
    usedRatio: totalBytes > 0 ? clamp01(used / totalBytes) : 0,
    pageins: pages.Pageins ?? 0,
    pageouts: pages.Pageouts ?? 0,
    pageSize,
  };
}

export function parseMemoryFreePercent(text: string): number | undefined {
  const match = FREE_PCT_RE.exec(text);
  if (!match) return undefined;
  return Number(match[1]);
}

export function pressureRatioFromFreePercent(freePercent: number): number {
  return clamp01(1 - freePercent / 100);
}

export function parseSwapBytes(text: string): { used: number; total: number } {
  return { used: parseSizedToken(SWAP_USED_RE.exec(text)), total: parseSizedToken(SWAP_TOTAL_RE.exec(text)) };
}

/** 分页速率：页计数差 × 页大小 / 秒。计数回绕或时钟倒退当 0。 */
export function pagingBytesPerSec(
  prevCount: number,
  prevAt: number,
  count: number,
  at: number,
  pageSize: number,
): number {
  const dt = (at - prevAt) / 1000;
  if (!(dt > 0) || count < prevCount || pageSize <= 0) return 0;
  return ((count - prevCount) * pageSize) / dt;
}

export function collectSystemRaw(): Promise<SystemRaw> {
  if (inFlight) return inFlight;
  inFlight = doCollect().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

async function perfLevels(): Promise<{ pCount: number; eCount: number }> {
  if (perfCache) return perfCache;
  const [pOut, eOut] = await Promise.all([
    run("sysctl", ["-n", "hw.perflevel0.logicalcpu"]).catch(() => "0"),
    run("sysctl", ["-n", "hw.perflevel1.logicalcpu"]).catch(() => "0"),
  ]);
  const parsed = parsePerfLevelCounts(pOut, eOut);
  const total = os.cpus().length;
  if (parsed.pCount + parsed.eCount === 0) perfCache = { pCount: total, eCount: 0 };
  else if (parsed.pCount + parsed.eCount !== total && parsed.pCount < total) {
    perfCache = { pCount: parsed.pCount, eCount: total - parsed.pCount };
  } else perfCache = parsed;
  return perfCache;
}

async function doCollect(): Promise<SystemRaw> {
  const coreTicks = readCoreTicks();
  const cpuTicks = sumTicks(coreTicks);
  const sampledAt = Date.now();
  const [vmOut, memSizeOut, swapOut, pressureOut, levelOut, perf] = await Promise.all([
    run("vm_stat", []),
    run("sysctl", ["-n", "hw.memsize"]),
    run("sysctl", ["vm.swapusage"]),
    run("memory_pressure", []).catch(() => ""),
    run("sysctl", ["-n", "kern.memorystatus_vm_pressure_level"]).catch(() => "1"),
    perfLevels(),
  ]);
  const { pageSize, pages } = parseVmStat(vmOut);
  const memory = composeMemory(Number(memSizeOut.trim()) || 0, pageSize, pages);
  const swap = parseSwapBytes(swapOut);
  const freePercent = parseMemoryFreePercent(pressureOut);
  return {
    cpuTicks,
    coreTicks,
    pCount: perf.pCount,
    eCount: perf.eCount,
    sampledAt,
    memory,
    swapUsedBytes: swap.used,
    swapTotalBytes: swap.total,
    pressureRatio: freePercent === undefined ? undefined : pressureRatioFromFreePercent(freePercent),
    pressureLevel: Number(levelOut.trim()) || 1,
  };
}

function parseSizedToken(match: RegExpExecArray | null): number {
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  const unit = match[2].toUpperCase();
  if (unit === "K") return value * 1024;
  if (unit === "M") return value * 1024 * 1024;
  return value * 1024 * 1024 * 1024;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
