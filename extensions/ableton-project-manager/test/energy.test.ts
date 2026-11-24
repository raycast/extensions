import { describe, expect, it } from "vitest";
import { energyLevelFromScore, energyScore } from "../src/core/projects/track-info";

// 测试环境没有设偏好，三项权重都回落到 Normal（1）。
const unit = { min: 0, max: 1 };
const crestRange = { min: 2, max: 10 };

describe("energyScore", () => {
  it("最密、最亮、最活跃 → 1；最松、最暗、最静 → 0", () => {
    expect(energyScore({ crest: 2, brightness: 1, activity: 1 }, crestRange, unit, unit)).toBe(1);
    expect(energyScore({ crest: 10, brightness: 0, activity: 0 }, crestRange, unit, unit)).toBe(0);
  });

  it("波峰因数取反：越小能量越高", () => {
    expect(energyScore({ crest: 3, brightness: null, activity: null }, crestRange, unit, unit)).toBeCloseTo(0.875);
    expect(energyScore({ crest: 9, brightness: null, activity: null }, crestRange, unit, unit)).toBeCloseTo(0.125);
  });

  it("缺失的特征跳过，并按剩余权重重新归一", () => {
    expect(energyScore({ crest: null, brightness: 0.75, activity: null }, crestRange, unit, unit)).toBeCloseTo(0.75);
    expect(energyScore({ crest: null, brightness: 1, activity: 0 }, crestRange, unit, unit)).toBeCloseTo(0.5);
  });

  it("三项全缺返回 null", () => {
    expect(energyScore({ crest: null, brightness: null, activity: null }, crestRange, unit, unit)).toBeNull();
  });

  it("范围无效（只有一首、或全都一样）时按居中 0.5 处理", () => {
    const flat = { min: 0.4, max: 0.4 };
    expect(energyScore({ crest: 5, brightness: 0.4, activity: 0.4 }, { min: 5, max: 5 }, flat, flat)).toBe(0.5);
  });

  it("超出范围的值被夹在 0..1 内", () => {
    expect(energyScore({ crest: null, brightness: 2, activity: null }, crestRange, unit, unit)).toBe(1);
    expect(energyScore({ crest: null, brightness: -1, activity: null }, crestRange, unit, unit)).toBe(0);
  });
});

describe("energyLevelFromScore", () => {
  it("0..1 映射到 1–5 档", () => {
    expect(energyLevelFromScore(0)).toBe(1);
    expect(energyLevelFromScore(0.5)).toBe(3);
    expect(energyLevelFromScore(1)).toBe(5);
  });

  it("越界的分数被夹在 1–5", () => {
    expect(energyLevelFromScore(-1)).toBe(1);
    expect(energyLevelFromScore(2)).toBe(5);
  });
});
