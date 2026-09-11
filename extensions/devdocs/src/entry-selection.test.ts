import { describe, expect, it } from "vitest";
import { getEntryId, getSelectedEntryId } from "./entry-selection";
import { Entry } from "./types";

const entry = (name: string, path: string, type: string): Entry => ({ name, path, type });

describe("entry selection", () => {
  it("selects the first filtered entry instead of preserving a stale focused entry", () => {
    const firstMatch = entry("Mapping", "library/collections.abc#collections.abc.Mapping", "class");
    const staleFocusedMatch = entry(
      "email.charset.add_alias",
      "library/email.charset#email.charset.add_alias",
      "method",
    );

    const staleFocusedId = getEntryId(staleFocusedMatch);
    const selectedId = getSelectedEntryId([firstMatch, staleFocusedMatch]);

    expect(selectedId).toBe(getEntryId(firstMatch));
    expect(selectedId).not.toBe(staleFocusedId);
  });
});
