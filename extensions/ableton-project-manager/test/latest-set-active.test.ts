import { describe, expect, it } from "vitest";
import { findLatestSet } from "../src/core/projects/latest-set";
import type { DawSet } from "../src/daws/types";

function set(name: string, modifiedAt: number, active?: boolean): DawSet {
  return {
    name,
    path: `/projects/Demo.dawproj`,
    metadataFile: `/projects/Demo.dawproj/Alternatives/${name}/MetaData.plist`,
    createdAt: 0,
    modifiedAt,
    ...(active === undefined ? {} : { active }),
  };
}

describe("findLatestSet", () => {
  it("有 active 的 Set 时返回它，不看修改时间", () => {
    const sets = [set("000", 300), set("003", 100, true), set("004", 200, false)];
    expect(findLatestSet(sets)?.name).toBe("003");
  });

  it("有 active 字段但全是 false 时返回 null，不猜", () => {
    const sets = [set("000", 300, false), set("003", 100, false)];
    expect(findLatestSet(sets)).toBeNull();
  });

  it("全都没有 active 字段时返回修改时间最新的", () => {
    const sets = [set("000", 100), set("003", 300), set("004", 200)];
    expect(findLatestSet(sets)?.name).toBe("003");
  });
});
