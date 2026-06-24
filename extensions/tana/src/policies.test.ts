import { describe, expect, it, vi } from "vitest";
import { createSubmissionGate, resolveMoveTargetNodeId, runConfirmedAction } from "./policies";

describe("Raycast interaction policies", () => {
  it("prevents overlapping submissions and reopens after completion", () => {
    const gate = createSubmissionGate();
    expect(gate.enter()).toBe(true);
    expect(gate.enter()).toBe(false);
    gate.leave();
    expect(gate.enter()).toBe(true);
  });

  it("never invokes a destructive action when confirmation is declined", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    await expect(runConfirmedAction(false, action)).resolves.toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it("prefers a manual move target when search indexing has not caught up", () => {
    expect(resolveMoveTargetNodeId("stale-search-result", "  new-parent-id  ")).toBe("new-parent-id");
    expect(resolveMoveTargetNodeId("selected-parent", "")).toBe("selected-parent");
  });
});
