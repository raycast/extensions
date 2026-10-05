import { describe, expect, it } from "vitest";

import { emptySelectionTouches, mergeScanSelection } from "./selection";
import type { CleanupCandidate } from "./types";

function candidate(id: string, selectedByDefault: boolean): CleanupCandidate {
  return {
    id,
    providerId: "npm",
    section: "Package Managers",
    title: id,
    subtitle: id,
    description: "test",
    cleanupPolicy: "command",
    risk: "safe",
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
