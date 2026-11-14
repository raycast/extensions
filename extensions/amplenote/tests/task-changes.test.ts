import { describe, expect, it } from "vitest";
import { applyOverrides, clearOverridesBefore, recordOverride } from "../src/lib/taskOverrides";
import { aTask } from "./builders";

describe("task overrides", () => {
  it("applies the latest local change on top of the loaded task", () => {
    const task = aTask({ uuid: "t1", important: false });
    const overrides = recordOverride({}, "t1", { important: true }, 100);
    expect(applyOverrides([task], overrides)[0].important).toBe(true);
  });

  it("a refresh only clears changes made before it started", () => {
    let overrides = recordOverride({}, "old", { completedAt: 1 }, 100);
    overrides = recordOverride(overrides, "new", { completedAt: 2 }, 300);

    const after = clearOverridesBefore(overrides, 200);

    expect(Object.keys(after)).toEqual(["new"]);
  });

  it("a later change to the same task keeps it from being cleared", () => {
    let overrides = recordOverride({}, "t1", { important: true }, 100);
    overrides = recordOverride(overrides, "t1", { urgent: true }, 300);

    const after = clearOverridesBefore(overrides, 200);

    expect(after.t1.changes).toEqual({ important: true, urgent: true });
  });
});
