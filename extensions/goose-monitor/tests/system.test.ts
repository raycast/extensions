import { describe, expect, test } from "bun:test";
import { fmtMemParts, fmtPctInt } from "../src/lib/format";
import {
  composeMemory,
  cpuRatio,
  cpuSplit,
  pagingBytesPerSec,
  parseMemoryFreePercent,
  parsePerfLevelCounts,
  parseSwapBytes,
  parseVmStat,
  pressureRatioFromFreePercent,
  splitPAndE,
  collectSystemRaw,
} from "../src/lib/system";

const VM_STAT = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                    56291.
Pages active:                                 971332.
Pages inactive:                               990546.
Pages speculative:                             17772.
Pages throttled:                                   0.
Pages wired down:                             330751.
Pages purgeable:                               72024.
"Translation faults":                     6208577366.
File-backed pages:                            648872.
Anonymous pages:                             1330778.
Pages occupied by compressor:                 736092.
Pageins:                                    40278924.
Pageouts:                                       2645.
`;

describe("parseVmStat / composeMemory", () => {
  test("抽出页大小与带引号的键", () => {
    const { pageSize, pages } = parseVmStat(VM_STAT);
    expect(pageSize).toBe(16384);
    expect(pages["Pages wired down"]).toBe(330751);
    expect(pages["Translation faults"]).toBe(6208577366);
    expect(pages.Pageouts).toBe(2645);
  });

  test("App+Wired+Compressed+Available = total，usedRatio 为 used/total", () => {
    const pages = {
      "Pages active": 100,
      "Pages inactive": 20,
      "Pages speculative": 0,
      "Pages wired down": 30,
      "Pages occupied by compressor": 10,
      "Pages purgeable": 5,
      "File-backed pages": 15,
      Pageins: 9,
      Pageouts: 3,
    };
    const mem = composeMemory(20_000, 100, pages);
    expect(mem.usedBytes).toBe(14_000);
    expect(mem.appBytes).toBe(10_000);
    expect(mem.wiredBytes).toBe(3_000);
    expect(mem.compressedBytes).toBe(1_000);
    expect(mem.availableBytes).toBe(6_000);
    expect(mem.appBytes + mem.wiredBytes + mem.compressedBytes + mem.availableBytes).toBe(20_000);
    expect(mem.usedRatio).toBeCloseTo(0.7);
  });
});

describe("pressure / swap / cpu / paging", () => {
  test("pressure = 100 - memory_pressure 的 free%", () => {
    expect(parseMemoryFreePercent("System-wide memory free percentage: 65%\n")).toBe(65);
    expect(pressureRatioFromFreePercent(65)).toBeCloseTo(0.35);
    expect(parseMemoryFreePercent("nope")).toBeUndefined();
  });

  test("swap 解析 M/G", () => {
    expect(parseSwapBytes("vm.swapusage: total = 2.00G  used = 512.0M  free = 1.50G  (encrypted)")).toEqual({
      used: 512 * 1024 * 1024,
      total: 2 * 1024 * 1024 * 1024,
    });
  });

  test("cpuRatio 用 idle 占比，tick 未动则 undefined", () => {
    const prev = { user: 10, nice: 0, sys: 5, idle: 85, irq: 0 };
    expect(cpuRatio(prev, prev)).toBeUndefined();
    expect(cpuRatio(prev, { user: 30, nice: 0, sys: 15, idle: 95, irq: 0 })).toBeCloseTo(0.75);
    expect(cpuRatio(prev, { user: 10, nice: 0, sys: 5, idle: 185, irq: 0 })).toBe(0);
  });

  test("cpuSplit 拆出用户 / 系统", () => {
    const prev = { user: 10, nice: 0, sys: 5, idle: 85, irq: 0 };
    const split = cpuSplit(prev, { user: 30, nice: 0, sys: 15, idle: 95, irq: 0 });
    expect(split?.used).toBeCloseTo(0.75);
    expect(split?.user).toBeCloseTo(0.5);
    expect(split?.sys).toBeCloseTo(0.25);
  });

  test("性能核在前、能效核在后", () => {
    expect(parsePerfLevelCounts("10\n", "4\n")).toEqual({ pCount: 10, eCount: 4 });
    expect(splitPAndE([0.1, 0.2, 0.3, 0.4], 2)).toEqual({ p: [0.1, 0.2], e: [0.3, 0.4] });
  });

  test("分页速率按页差", () => {
    expect(pagingBytesPerSec(10, 0, 20, 1000, 4096)).toBe(10 * 4096);
    expect(pagingBytesPerSec(20, 1000, 10, 2000, 4096)).toBe(0);
  });
});

describe("fmtPctInt / fmtMemParts", () => {
  test("环心取整百分比，分解到 KB", () => {
    expect(fmtPctInt(0.345)).toBe("35%");
    expect(fmtPctInt(undefined)).toBe("—");
    expect(fmtMemParts(0)).toBe("0 KB");
    expect(fmtMemParts(18.3 * 1024 * 1024 * 1024)).toBe("18.3 GB");
  });
});

describe("collectSystemRaw", () => {
  test("本机采到正的内存总量与 0–1 占用", async () => {
    const stats = await collectSystemRaw();
    expect(stats.memory.totalBytes).toBeGreaterThan(1_000_000_000);
    expect(stats.memory.usedRatio).toBeGreaterThanOrEqual(0);
    expect(stats.memory.usedRatio).toBeLessThanOrEqual(1);
    expect(stats.memory.appBytes + stats.memory.wiredBytes + stats.memory.compressedBytes).toBe(stats.memory.usedBytes);
    expect(stats.pressureLevel === 1 || stats.pressureLevel === 2 || stats.pressureLevel === 4).toBe(true);
    expect(stats.coreTicks.length).toBeGreaterThan(0);
    expect(stats.pCount + stats.eCount).toBe(stats.coreTicks.length);
  });
});
