import { describe, expect, it } from "vitest";

import { resolveDestinationSelection } from "../src/lib/destination-selection";

describe("destination selection", () => {
  it("restores an available stored destination", () => {
    expect(
      resolveDestinationSelection({
        currentId: "",
        storedId: "work",
        defaultId: "personal",
        availableIds: ["personal", "work"],
      }),
    ).toEqual({ selectedId: "work", requiresReselection: false });
  });

  it("uses the default only when there is no previous selection", () => {
    expect(
      resolveDestinationSelection({
        currentId: "",
        storedId: "",
        defaultId: "personal",
        availableIds: ["work", "personal"],
      }),
    ).toEqual({ selectedId: "personal", requiresReselection: false });
  });

  it("requires an explicit choice when the previous destination disappeared", () => {
    expect(
      resolveDestinationSelection({
        currentId: "",
        storedId: "deleted",
        defaultId: "personal",
        availableIds: ["personal", "work"],
      }),
    ).toEqual({ selectedId: "", requiresReselection: true });
  });

  it("falls back to the first writable destination only on first use", () => {
    expect(
      resolveDestinationSelection({
        currentId: "",
        storedId: "",
        defaultId: "unwritable",
        availableIds: ["work"],
      }),
    ).toEqual({ selectedId: "work", requiresReselection: false });
  });
});
