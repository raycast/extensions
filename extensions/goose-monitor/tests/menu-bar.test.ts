import { describe, expect, test } from "bun:test";
import {
  advanceCpu,
  advanceMem,
  hottestRows,
  isCpuPersist,
  isMemPersist,
  menuItemTitle,
  splitHottestRows,
  truncateName,
} from "../src/lib/menu-bar";
import { coreUsedList, type SystemRaw } from "../src/lib/system";
import type { AppRow } from "../src/lib/types";

const MIB = 1024 * 1024;

const row = (over: Partial<AppRow>): AppRow => ({
  id: over.id ?? over.name ?? "id",
  identity: "exe:/bin/x",
  snapshotToken: "t",
  name: "X",
  path: "/bin/x",
  pid: 1,
  allPids: [1],
  cpu: 0,
  memBytes: 0,
  procs: 1,
  helpers: [],
  ports: [],
  protected: false,
  kind: "other",
  hasWindow: false,
  ...over,
});

describe("hottestRows", () => {
  test("按 CPU 取前 N，同值按名称稳定", () => {
    const rows = [
      row({ id: "a", name: "Chrome", cpu: 40 }),
      row({ id: "b", name: "Cursor", cpu: 12 }),
      row({ id: "c", name: "Zoom", cpu: 40 }),
    ];
    expect(hottestRows(rows, "cpu", 2).map((item) => item.name)).toEqual(["Chrome", "Zoom"]);
  });

  test("按内存取前 N", () => {
    const rows = [row({ id: "a", name: "A", memBytes: 100 * MIB }), row({ id: "b", name: "B", memBytes: 800 * MIB })];
    expect(hottestRows(rows, "mem", 1)[0].name).toBe("B");
  });
});

describe("splitHottestRows", () => {
  test("Top5 展开，其余（最多 8 内的）收进子菜单", () => {
    const rows = Array.from({ length: 8 }, (_, i) => row({ id: `r${i}`, name: `R${i}`, memBytes: (8 - i) * MIB }));
    const { top, rest } = splitHottestRows(rows, "mem");
    expect(top.map((item) => item.name)).toEqual(["R0", "R1", "R2", "R3", "R4"]);
    expect(rest.map((item) => item.name)).toEqual(["R5", "R6", "R7"]);
  });

  test("不足 5 个时没有子菜单", () => {
    const rows = [row({ id: "a", name: "A", memBytes: MIB })];
    expect(splitHottestRows(rows, "mem")).toEqual({ top: rows, rest: [] });
  });
});

describe("truncateName", () => {
  test("按 Unicode 字符截断，中文不会切半个码元", () => {
    expect(truncateName("企业微信", 10)).toBe("企业微信");
    expect(truncateName("企业微信会议测试名称", 6)).toBe("企业微信会…");
  });
});

describe("menuItemTitle", () => {
  const chrome = row({ name: "Chrome", cpu: 12.34, memBytes: 2048 * MIB });

  test("CPU 与内存段 title 不同，避免菜单栏同级重名", () => {
    expect(menuItemTitle(chrome, "cpu")).toBe("Chrome · 12.3%");
    expect(menuItemTitle(chrome, "mem")).toBe("Chrome · 2.0 GB");
  });
});

const ticks = { user: 10, nice: 0, sys: 5, idle: 85, irq: 0 };

const raw = (over: Partial<SystemRaw> = {}): SystemRaw => ({
  cpuTicks: ticks,
  coreTicks: [ticks],
  pCount: 1,
  eCount: 0,
  sampledAt: 1_000,
  memory: {
    totalBytes: 10_000,
    appBytes: 4_000,
    wiredBytes: 1_000,
    compressedBytes: 1_000,
    availableBytes: 4_000,
    cachedBytes: 500,
    usedBytes: 6_000,
    usedRatio: 0.6,
    pageins: 20,
    pageouts: 4,
    pageSize: 4096,
  },
  swapUsedBytes: 0,
  swapTotalBytes: 0,
  pressureRatio: 0.3,
  pressureLevel: 1,
  ...over,
});

describe("持久化状态校验", () => {
  test("形状不对的缓存判为无效，不再抛 TypeError", () => {
    expect(isCpuPersist({})).toBe(false);
    expect(isCpuPersist({ ticks: null, coreTicks: null })).toBe(false);
    expect(isCpuPersist({ ticks, coreTicks: 5, sampledAt: 1_000, history: [] })).toBe(false);
    expect(isCpuPersist({ ticks, coreTicks: [ticks], sampledAt: 1_000, history: [] })).toBe(true);

    expect(isMemPersist({ memHistory: 0.5 })).toBe(false);
    expect(isMemPersist({ sampledAt: 1_000, pageins: 1, pageouts: 1, memHistory: ["x"], pressureHistory: [] })).toBe(
      false,
    );
    expect(isMemPersist({ sampledAt: 1_000, pageins: 1, pageouts: 1, memHistory: [0.6], pressureHistory: [] })).toBe(
      true,
    );
  });
});

describe("advanceCpu / advanceMem", () => {
  test("首样本传入补采样每核占用后 p/e 不再为空", () => {
    const before = [ticks, ticks];
    const after = [{ user: 30, nice: 0, sys: 15, idle: 95, irq: 0 }, ticks];
    // 核 0：Δuser 20 + Δsys 10 + Δidle 10 = 40 → 0.75；核 1 无 tick 前进 → 0
    const coreUsed = coreUsedList(before, after);
    expect(coreUsed).toEqual([0.75, 0]);

    const first = advanceCpu(undefined, raw({ coreTicks: after }), { used: 0.4, user: 0.25, sys: 0.15 }, coreUsed);
    expect(first.pCores).toEqual([0.75]);
    expect(first.eCores).toEqual([0]);
  });

  test("CPU 无前值时不写 history，有 override 才入列", () => {
    const first = advanceCpu(undefined, raw());
    expect(first.cpuRatio).toBeUndefined();
    expect(first.persist.history).toEqual([]);

    const primed = advanceCpu(undefined, raw(), { used: 0.4, user: 0.25, sys: 0.15 });
    expect(primed.cpuRatio).toBe(0.4);
    expect(primed.persist.history).toEqual([{ user: 0.25, sys: 0.15 }]);
  });

  test("CPU 用 tick 差算用户/系统占用，history 追加", () => {
    const prev = advanceCpu(undefined, raw(), { used: 0.1, user: 0.06, sys: 0.04 }).persist;
    const later = { user: 30, nice: 0, sys: 15, idle: 95, irq: 0 };
    const next = advanceCpu(
      prev,
      raw({
        cpuTicks: later,
        coreTicks: [later],
        sampledAt: 2_000,
      }),
    );
    // Δuser 20 + Δsys 10 + Δidle 10 = 40，占用 30/40 = 0.75，用户 0.5，系统 0.25
    expect(next.cpuRatio).toBeCloseTo(0.75);
    expect(next.userRatio).toBeCloseTo(0.5);
    expect(next.sysRatio).toBeCloseTo(0.25);
    expect(next.persist.history).toEqual([
      { user: 0.06, sys: 0.04 },
      { user: 0.5, sys: 0.25 },
    ]);
  });

  test("内存立刻入列，分页速率按页差 / 时间", () => {
    const first = advanceMem(undefined, raw());
    expect(first.pageInBytesPerSec).toBe(0);
    expect(first.persist.memHistory).toEqual([0.6]);

    const next = advanceMem(
      first.persist,
      raw({
        sampledAt: 2_000,
        memory: { ...raw().memory, pageins: 30, pageouts: 4, usedRatio: 0.7 },
      }),
    );
    expect(next.pageInBytesPerSec).toBe((10 * 4096) / 1);
    expect(next.pageOutBytesPerSec).toBe(0);
    expect(next.persist.memHistory).toEqual([0.6, 0.7]);
  });

  test("压力采集失败时不写入 0 历史", () => {
    const unknown = advanceMem(undefined, raw({ pressureRatio: undefined }));
    expect(unknown.persist.pressureHistory).toEqual([]);

    const known = advanceMem(unknown.persist, raw({ sampledAt: 2_000, pressureRatio: 0.4 }));
    expect(known.persist.pressureHistory).toEqual([0.4]);
  });
});
