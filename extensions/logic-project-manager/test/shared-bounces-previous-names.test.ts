import { describe, expect, it } from "vitest";
import { assignSharedBounces } from "@/core/projects/bounces";

// 改名时间：2026-01-01 00:00:00 UTC。
const RENAMED_AT = Date.UTC(2026, 0, 1);
const BEFORE = RENAMED_AT - 1000;
const AFTER = RENAMED_AT + 1000;

describe("assignSharedBounces 的旧名字", () => {
  it("旧名字只认 before 之前创建的文件", () => {
    const result = assignSharedBounces(["Old Name v1.wav", "Old Name v2.wav"], ["New Name"], {}, {
      previousNames: { "New Name": [{ name: "Old Name", before: RENAMED_AT }] },
      createdAtOf: (fileName) => (fileName === "Old Name v1.wav" ? BEFORE : AFTER),
    });
    expect(result.get("New Name")).toEqual(["Old Name v1.wav"]);
  });

  it("不给 createdAtOf 时，旧名字一律不认", () => {
    const result = assignSharedBounces(["Old Name v1.wav"], ["New Name"], {}, {
      previousNames: { "New Name": [{ name: "Old Name", before: RENAMED_AT }] },
    });
    expect(result.get("New Name")).toBeUndefined();
  });

  it("旧名字和另一个项目现在的名字一样长、相同时，归现在叫这个名字的项目", () => {
    const result = assignSharedBounces(["Old Name v1.wav"], ["Old Name", "New Name"], {}, {
      previousNames: { "New Name": [{ name: "Old Name", before: RENAMED_AT }] },
      createdAtOf: () => BEFORE,
    });
    expect(result.get("Old Name")).toEqual(["Old Name v1.wav"]);
    expect(result.get("New Name")).toBeUndefined();
  });

  it("旧名字比别的名字长时，照样按最长的匹配", () => {
    const result = assignSharedBounces(["Demo Package v1.wav"], ["Demo", "New Name"], {}, {
      previousNames: { "New Name": [{ name: "Demo Package", before: RENAMED_AT }] },
      createdAtOf: () => BEFORE,
    });
    expect(result.get("New Name")).toEqual(["Demo Package v1.wav"]);
    expect(result.get("Demo")).toBeUndefined();
  });
});

describe("assignSharedBounces 的 exclusions", () => {
  it("被排除的文件不归这个项目", () => {
    const result = assignSharedBounces(["Demo Package v1.wav"], ["Demo Package"], {}, {
      exclusions: { "Demo Package": ["Demo Package v1.wav"] },
    });
    expect(result.get("Demo Package")).toBeUndefined();
  });

  it("被排除的文件也不会转给名字更短、同样能对上的另一个项目", () => {
    const result = assignSharedBounces(["Demo Package v1.wav"], ["Demo", "Demo Package"], {}, {
      exclusions: { "Demo Package": ["Demo Package v1.wav"] },
    });
    expect(result.get("Demo Package")).toBeUndefined();
    expect(result.get("Demo")).toBeUndefined();
  });
});
