import { describe, expect, it } from "vitest";
import { INITIAL_ITEM_COUNT, itemLimit, limitGroups } from "@/core/ui/shared/progressive-list";

describe("itemLimit", () => {
  it("还没补全时是首帧上限", () => {
    expect(itemLimit(false)).toBe(INITIAL_ITEM_COUNT);
  });

  it("补全后不设上限", () => {
    expect(itemLimit(true)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("limitGroups", () => {
  const groups = [
    { key: "a", title: "A", subtitle: "3", items: [1, 2, 3] },
    { key: "b", title: "B", subtitle: "2", items: [4, 5] },
  ];

  it("按顺序用掉名额，后面的分组被截空后不渲染", () => {
    expect(limitGroups(groups, 4)).toEqual([
      { key: "a", title: "A", subtitle: "3", items: [1, 2, 3] },
      { key: "b", title: "B", subtitle: "2", items: [4] },
    ]);
  });

  it("名额用完时只剩第一组的一部分", () => {
    expect(limitGroups(groups, 2)).toEqual([{ key: "a", title: "A", subtitle: "3", items: [1, 2] }]);
  });

  it("名额为 0 时什么都不渲染", () => {
    expect(limitGroups(groups, 0)).toEqual([]);
  });

  it("名额足够时原样返回", () => {
    expect(limitGroups(groups, Number.POSITIVE_INFINITY)).toEqual(groups);
  });

  it("空分组列表返回空数组", () => {
    expect(limitGroups([], 15)).toEqual([]);
  });

  it("只有一个分组时也按名额截断", () => {
    expect(limitGroups([{ key: "a", title: "A", subtitle: "1", items: [1] }], 1)).toEqual([
      { key: "a", title: "A", subtitle: "1", items: [1] },
    ]);
  });
});
