import { describe, expect, test } from "bun:test";
import { refreshSnapshot } from "../src/lib/snapshot";

describe("refreshSnapshot 按需采集", () => {
  test("跳过 gui 与 net 时耗时远低于 1s，且保留端口与能力开关", async () => {
    const t0 = performance.now();
    const snapshot = await refreshSnapshot({ gui: false, net: false });
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(350);
    expect(snapshot.rows.length).toBeGreaterThan(0);
    expect(snapshot.capabilities).toEqual({ gui: true, net: true });
    // 未采网络与窗口：不贴速率与窗口标记
    expect(snapshot.rows.every((row) => row.netDown === undefined && row.netUp === undefined)).toBe(true);
    expect(snapshot.rows.every((row) => !row.hasWindow)).toBe(true);
  });

  test("ports: false 跳过端口采集，所有行端口为空", async () => {
    const snapshot = await refreshSnapshot({ gui: false, net: false, ports: false });
    expect(snapshot.rows.length).toBeGreaterThan(0);
    expect(snapshot.rows.every((row) => row.ports.length === 0)).toBe(true);
  });

  test("gui: true 采集窗口并标记 hasWindow", async () => {
    const snapshot = await refreshSnapshot({ gui: true, net: false });
    expect(snapshot.capabilities.gui).toBe(true);
    expect(snapshot.rows.some((row) => row.hasWindow)).toBe(true);
  });

  test("单飞：相同选项并发调用复用同一个进行中的 Promise", async () => {
    const p1 = refreshSnapshot({ gui: false, net: false });
    const p2 = refreshSnapshot({ gui: false, net: false });
    expect(p1).toBe(p2);
    const [s1, s2] = await Promise.all([p1, p2]);
    expect(s1).toBe(s2);
  });
});
