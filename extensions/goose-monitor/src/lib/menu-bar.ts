import { sortRows } from "./categories";
import { fmtCpu, fmtMem } from "./format";
import { pushCpuBars, pushHistory, type CpuBar } from "./sparkline";
import {
  coreUsedList,
  cpuSplit,
  meanRatio,
  pagingBytesPerSec,
  splitPAndE,
  type CpuSplit,
  type CpuTicks,
  type SystemRaw,
} from "./system";
import type { AppRow } from "./types";

export const MENU_BAR_TOP_N = 5;
export const MENU_BAR_MEM_N = 8;

/** 菜单栏标题尽量短，避免占满状态栏。 */
const TITLE_NAME_CHARS = 10;

export interface CpuPersist {
  ticks: CpuTicks;
  coreTicks: CpuTicks[];
  sampledAt: number;
  history: CpuBar[];
}

export interface MemPersist {
  sampledAt: number;
  pageins: number;
  pageouts: number;
  memHistory: number[];
  pressureHistory: number[];
}

export interface CpuAdvance {
  persist: CpuPersist;
  cpuRatio: number | undefined;
  userRatio: number | undefined;
  sysRatio: number | undefined;
  pRatio: number | undefined;
  eRatio: number | undefined;
  pCores: number[];
  eCores: number[];
}

export interface MemAdvance {
  persist: MemPersist;
  pageInBytesPerSec: number;
  pageOutBytesPerSec: number;
}

export function hottestRows(rows: readonly AppRow[], key: "cpu" | "mem", n = MENU_BAR_TOP_N): AppRow[] {
  return sortRows(rows, key, "desc").slice(0, n);
}

/** 菜单栏进程段：Top MENU_BAR_TOP_N 直接展开，其余收进子菜单（子菜单里仍能结束）。 */
export function splitHottestRows(
  rows: readonly AppRow[],
  key: "cpu" | "mem",
  n = MENU_BAR_MEM_N,
): { top: AppRow[]; rest: AppRow[] } {
  const ranked = hottestRows(rows, key, n);
  return { top: ranked.slice(0, MENU_BAR_TOP_N), rest: ranked.slice(MENU_BAR_TOP_N) };
}

export function truncateName(name: string, max = TITLE_NAME_CHARS): string {
  const chars = [...name];
  if (chars.length <= max) return name;
  return `${chars.slice(0, Math.max(1, max - 1)).join("")}…`;
}

/** 行标题带指标，CPU / Memory 两段同名应用也不会撞 title。 */
export function menuItemTitle(row: AppRow, metric: "cpu" | "mem"): string {
  return metric === "cpu" ? `${row.name} · ${fmtCpu(row.cpu)}` : `${row.name} · ${fmtMem(row.memBytes)}`;
}

/** 持久化文件可能被写坏或来自旧版本：形状不对就当没有历史，避免整条命令抛异常。 */
export function isCpuPersist(value: unknown): value is CpuPersist {
  const v = value as CpuPersist | undefined;
  return (
    !!v &&
    typeof v === "object" &&
    isTicks(v.ticks) &&
    Array.isArray(v.coreTicks) &&
    v.coreTicks.every(isTicks) &&
    isFiniteNumber(v.sampledAt) &&
    Array.isArray(v.history)
  );
}

export function isMemPersist(value: unknown): value is MemPersist {
  const v = value as MemPersist | undefined;
  return (
    !!v &&
    typeof v === "object" &&
    isFiniteNumber(v.sampledAt) &&
    isFiniteNumber(v.pageins) &&
    isFiniteNumber(v.pageouts) &&
    Array.isArray(v.memHistory) &&
    v.memHistory.every(isFiniteNumber) &&
    Array.isArray(v.pressureHistory)
  );
}

function isTicks(value: unknown): boolean {
  const t = value as CpuTicks | undefined;
  return (
    !!t &&
    typeof t === "object" &&
    isFiniteNumber(t.user) &&
    isFiniteNumber(t.nice) &&
    isFiniteNumber(t.sys) &&
    isFiniteNumber(t.idle) &&
    isFiniteNumber(t.irq)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** coreUsedOverride 用于首次采样：那一次没有 prev 核心 tick，但已经量到两组样本。 */
export function advanceCpu(
  prev: CpuPersist | undefined,
  raw: SystemRaw,
  splitOverride?: CpuSplit,
  coreUsedOverride?: number[],
): CpuAdvance {
  const split = splitOverride ?? (prev ? cpuSplit(prev.ticks, raw.cpuTicks) : undefined);
  const used = coreUsedOverride ?? (prev ? coreUsedList(prev.coreTicks, raw.coreTicks) : []);
  const parts = splitPAndE(used, raw.pCount);
  return {
    persist: {
      ticks: raw.cpuTicks,
      coreTicks: raw.coreTicks,
      sampledAt: raw.sampledAt,
      history:
        split === undefined
          ? (prev?.history ?? [])
          : pushCpuBars(prev?.history ?? [], { user: split.user, sys: split.sys }),
    },
    cpuRatio: split?.used,
    userRatio: split?.user,
    sysRatio: split?.sys,
    pRatio: parts.p.length ? meanRatio(parts.p) : undefined,
    eRatio: parts.e.length ? meanRatio(parts.e) : undefined,
    pCores: parts.p,
    eCores: parts.e,
  };
}

export function advanceMem(prev: MemPersist | undefined, raw: SystemRaw): MemAdvance {
  const pageInBytesPerSec = prev
    ? pagingBytesPerSec(prev.pageins, prev.sampledAt, raw.memory.pageins, raw.sampledAt, raw.memory.pageSize)
    : 0;
  const pageOutBytesPerSec = prev
    ? pagingBytesPerSec(prev.pageouts, prev.sampledAt, raw.memory.pageouts, raw.sampledAt, raw.memory.pageSize)
    : 0;
  return {
    persist: {
      sampledAt: raw.sampledAt,
      pageins: raw.memory.pageins,
      pageouts: raw.memory.pageouts,
      memHistory: pushHistory(prev?.memHistory ?? [], raw.memory.usedRatio),
      // 压力采集失败（undefined）不写 0，否则历史把“未知”当成“无压力”。
      pressureHistory:
        raw.pressureRatio === undefined
          ? (prev?.pressureHistory ?? [])
          : pushHistory(prev?.pressureHistory ?? [], raw.pressureRatio),
    },
    pageInBytesPerSec,
    pageOutBytesPerSec,
  };
}
