import { describe, expect, test } from "bun:test";
import { applyCategory, CATEGORIES, defaultSort, filterRows, sortRows, visibleCategories } from "../src/lib/categories";
import { markVisibleWindows } from "../src/lib/windows";
import type { AppRow } from "../src/lib/types";

const MIB = 1024 * 1024;

const row = (over: Partial<AppRow> = {}): AppRow => ({
  id: "g1",
  identity: "app:/Applications/Foo.app",
  snapshotToken: "t1",
  name: "Foo",
  path: "/Applications/Foo.app",
  pid: 100,
  allPids: [100],
  cpu: 1,
  memBytes: 100 * MIB,
  procs: 1,
  helpers: [],
  ports: [],
  protected: false,
  kind: "app",
  hasWindow: false,
  ...over,
});

describe("分类过滤", () => {
  const rows = [
    row({ id: "a", name: "Chrome", hasWindow: true, cpu: 30, memBytes: 2000 * MIB, kind: "app" }),
    row({ id: "b", name: "WindowServer", hasWindow: true, kind: "app", memBytes: 900 * MIB, cpu: 0 }),
    row({ id: "c", name: "node", kind: "other", cpu: 5, memBytes: 300 * MIB }),
    row({ id: "d", name: "mds_stores", kind: "bg", cpu: 1, memBytes: 200 * MIB }),
    row({ id: "e", name: "1Password", kind: "app", cpu: 0, netDown: 2048, netUp: 512, memBytes: 150 * MIB }),
  ];

  test("all / cpu / mem 不过滤，默认内存降序", () => {
    for (const category of ["all", "cpu", "mem"] as const) {
      expect(filterRows(rows, category)).toHaveLength(5);
    }
    expect(applyCategory(rows, "mem").map((item) => item.name)[0]).toBe("Chrome");
  });

  test("gui 只看有可见窗口的行", () => {
    expect(filterRows(rows, "gui").map((item) => item.name)).toEqual(["Chrome", "WindowServer"]);
  });

  test("bg 只看系统自有且无界面的行", () => {
    expect(filterRows(rows, "bg").map((item) => item.name)).toEqual(["mds_stores"]);
  });

  test("net 只看采到速率的行，按总速率降序；没有采样则空", () => {
    expect(filterRows(rows, "net").map((item) => item.name)).toEqual(["1Password"]);
    expect(filterRows([row()], "net")).toEqual([]);
    expect(applyCategory(rows, "net")).toHaveLength(1);
  });

  test("cpu 分类按 CPU 降序，其余按内存降序", () => {
    expect(applyCategory(rows, "cpu").map((item) => item.name)).toEqual(["Chrome", "node", "mds_stores", "1Password", "WindowServer"]);
    expect(defaultSort("net")).toEqual({ key: "net", dir: "desc" });
  });

  test("可见分类随能力开关收敛，标题为英文", () => {
    expect(visibleCategories({ gui: false, net: false }).map((item) => item.id)).toEqual(["all", "cpu", "mem", "bg"]);
    expect(visibleCategories({ gui: true, net: true })).toHaveLength(6);
    expect(CATEGORIES.map((item) => item.title)).toEqual(["All", "GUI", "CPU", "Memory", "Network", "Background"]);
  });
});

describe("sortRows", () => {
  test("数值键升降序 + name 排序", () => {
    const rows = [row({ name: "b", memBytes: 2 * MIB }), row({ name: "a", memBytes: 10 * MIB })];
    expect(sortRows(rows, "mem", "desc").map((item) => item.name)).toEqual(["a", "b"]);
    expect(sortRows(rows, "mem", "asc").map((item) => item.name)).toEqual(["b", "a"]);
    expect(sortRows(rows, "name", "asc").map((item) => item.name)).toEqual(["a", "b"]);
    expect(sortRows(rows, "procs", "desc")[0].name).toBe("a");
    expect(sortRows(rows, "down", "desc")[0].name).toBe("a"); // 无采样按 0
  });
});

describe("markVisibleWindows", () => {
  test("组内任一 PID 命中即算界面应用", () => {
    const rows = [row({ allPids: [100, 101] }), row({ id: "g2", allPids: [200] })];
    markVisibleWindows(rows, [101]);
    expect(rows.map((item) => item.hasWindow)).toEqual([true, false]);
  });
});
