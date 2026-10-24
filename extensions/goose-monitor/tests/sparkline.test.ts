import { describe, expect, test } from "bun:test";
import {
  SPARKLINE_HISTORY,
  SPARKLINE_MEM_WIDTH,
  SPARKLINE_WIDTH,
  SPARK_SYS,
  SPARK_USER,
  coresGridSvg,
  pushHistory,
  ringSvg,
  sparklineSvg,
  stackedHistSvg,
  stackedRingSvg,
  stackedSparklineSvg,
} from "../src/lib/sparkline";

describe("pushHistory", () => {
  test("超长时丢掉最旧的", () => {
    let history: number[] = [];
    for (let i = 0; i < SPARKLINE_HISTORY + 3; i++) history = pushHistory(history, i / 100);
    expect(history).toHaveLength(SPARKLINE_HISTORY);
    expect(history[0]).toBeCloseTo(3 / 100);
    expect(history.at(-1)).toBeCloseTo((SPARKLINE_HISTORY + 2) / 100);
  });
});

describe("sparklineSvg", () => {
  test("空历史仍画出胶囊，没有样本柱", () => {
    const svg = sparklineSvg([], "#64D2FF");
    expect(svg).toContain('rx="6"');
    expect(svg).toContain("#1C1C1E");
    expect(svg).not.toContain("#64D2FF");
  });

  test("样本靠右，柱数等于样本数", () => {
    const svg = sparklineSvg([0.2, 0.8, 0.5], "#BF5AF2");
    expect(svg.match(/fill="#BF5AF2"/g)?.length).toBe(3);
    expect(svg).toContain("clipPath");
  });

  test("可指定宽度：菜单栏内存胶囊比 CPU 窄", () => {
    expect(SPARKLINE_MEM_WIDTH).toBeLessThan(SPARKLINE_WIDTH);
    expect(sparklineSvg([], "#BF5AF2")).toContain(`width="${SPARKLINE_WIDTH}"`);
    expect(sparklineSvg([], "#BF5AF2", SPARKLINE_MEM_WIDTH)).toContain(`width="${SPARKLINE_MEM_WIDTH}"`);
  });
});

describe("stackedSparklineSvg / stackedHistSvg / coresGridSvg", () => {
  test("CPU 胶囊含用户蓝与系统粉", () => {
    const svg = stackedSparklineSvg([
      { user: 0.12, sys: 0.07 },
      { user: 0.2, sys: 0.1 },
    ]);
    expect(svg).toContain(SPARK_USER);
    expect(svg).toContain(SPARK_SYS);
  });

  test("宽直方与核心环按性能/能效着色", () => {
    const hist = stackedHistSvg([{ user: 0.12, sys: 0.07 }]);
    expect(hist).toContain(SPARK_USER);
    expect(hist).toContain(SPARK_SYS);
    const cores = coresGridSvg([0.2, 0.4], [0.8]);
    expect(cores).toContain(SPARK_USER);
    expect(cores).toContain(SPARK_SYS);
    expect(cores.match(/<circle /g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("ringSvg / stackedRingSvg", () => {
  test("压力未知只画虚线底轨，与真实的 0 区分", () => {
    expect(ringSvg(undefined, "#0A84FF")).toContain("stroke-dasharray");
    expect(ringSvg(0, "#0A84FF")).not.toContain("stroke-dasharray");
  });

  test("单环用给定颜色，分段环按占比画多段", () => {
    const pressure = ringSvg(0.34, "#0A84FF");
    expect(pressure).toContain("#0A84FF");
    expect(pressure).toContain("rotate(-90 8 8)");

    const memory = stackedRingSvg([
      { ratio: 0.4, color: "#0A84FF" },
      { ratio: 0.1, color: "#FF375F" },
      { ratio: 0.2, color: "#FFD60A" },
    ]);
    expect(memory).toContain("#0A84FF");
    expect(memory).toContain("#FF375F");
    expect(memory).toContain("#FFD60A");
    expect(memory.match(/<circle /g)?.length).toBe(4);
  });
});
