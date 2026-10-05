import { describe, expect, it } from "vitest";
import { resolvePersistedSpaceSelection } from "./spaceSelection";

describe("resolvePersistedSpaceSelection", () => {
  it("falls back when nothing is selected", () => {
    expect(
      resolvePersistedSpaceSelection({
        currentSelection: "",
        validSelections: ["space-1"],
        fallbackSelection: "space-1",
      }),
    ).toBe("space-1");
  });

  it("keeps a valid persisted selection", () => {
    expect(
      resolvePersistedSpaceSelection({
        currentSelection: "space-2",
        validSelections: ["space-1", "space-2"],
        fallbackSelection: "space-1",
      }),
    ).toBe("space-2");
  });

  it("keeps always-allowed selections such as all spaces", () => {
    expect(
      resolvePersistedSpaceSelection({
        currentSelection: "all",
        validSelections: ["space-1"],
        fallbackSelection: "space-1",
        alwaysAllowedSelections: ["all"],
      }),
    ).toBe("all");
  });

  it("resets invalid selections to the fallback", () => {
    expect(
      resolvePersistedSpaceSelection({
        currentSelection: "missing-space",
        validSelections: ["space-1"],
        fallbackSelection: "space-1",
      }),
    ).toBe("space-1");
  });
});
