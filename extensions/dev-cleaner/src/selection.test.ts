import { describe, expect, it } from "vitest";

import { emptySelectionTouches, mergeScanSelection, type PreselectLevel } from "./selection";
import type { CleanupCandidate, RiskLevel } from "./types";

function candidate(id: string, selectedByDefault: boolean, risk: RiskLevel = "safe"): CleanupCandidate {
  return {
    id,
    providerId: "npm",
    section: "Package Managers",
    title: id,
    subtitle: id,
    description: "test",
    cleanupPolicy: "command",
    risk,
    selectedByDefault,
  };
}

describe("scan selection merge", () => {
  const candidates = [candidate("default-a", true), candidate("default-b", true), candidate("manual", false)];

  it("applies defaults when the user did not change the selection", () => {
    expect(mergeScanSelection(new Set(), candidates, new Set(), emptySelectionTouches())).toEqual(
      new Set(["default-a", "default-b"]),
    );
  });

  it("preselects untouched candidates by level and never preselects high risk", () => {
    const leveled = [
      candidate("recommended", true),
      candidate("safe", false),
      candidate("review", false, "review"),
      candidate("high", false, "high"),
    ];
    const merge = (level: PreselectLevel) =>
      mergeScanSelection(new Set(), leveled, new Set(), emptySelectionTouches(), level);
    expect(merge("recommended")).toEqual(new Set(["recommended"]));
    expect(merge("safe")).toEqual(new Set(["recommended", "safe"]));
    expect(merge("review")).toEqual(new Set(["recommended", "safe", "review"]));
    expect(merge("off")).toEqual(new Set());
  });

  it("keeps touched candidates when preselection is off", () => {
    const touches = { all: false, ids: new Set(["manual"]) };
    expect(mergeScanSelection(new Set(["manual"]), candidates, new Set(), touches, "off")).toEqual(new Set(["manual"]));
  });

  it("keeps items the user selected or unselected during the scan", () => {
    const touches = { all: false, ids: new Set(["manual", "default-b"]) };
    expect(mergeScanSelection(new Set(["manual"]), candidates, new Set(), touches)).toEqual(
      new Set(["default-a", "manual"]),
    );
  });

  it("keeps the whole selection after a preset or clear during the scan", () => {
    const touches = { all: true, ids: new Set<string>() };
    expect(mergeScanSelection(new Set(), candidates, new Set(), touches)).toEqual(new Set());
  });

  it("drops kept items and candidates that are no longer in the results", () => {
    const touches = { all: false, ids: new Set(["gone"]) };
    expect(mergeScanSelection(new Set(["gone"]), candidates, new Set(["default-a"]), touches)).toEqual(
      new Set(["default-b"]),
    );
  });
});
