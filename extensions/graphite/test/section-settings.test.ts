import { describe, expect, it } from "vitest";
import { Cache } from "@raycast/api";
import type { InboxSection } from "../src/lib/api";
import { readSectionSettings, SECTION_SETTINGS_KEY, visibleSections } from "../src/lib/section-settings";

const section = (sectionId: string): InboxSection => ({
  sectionId,
  name: sectionId,
  includeInTotalCount: true,
  totalUnpaginatedPrs: 0,
  prs: [],
});

describe("section settings", () => {
  it("reads what useCachedState stored and applies order and hidden sections", () => {
    const cache = new Cache();
    cache.set(SECTION_SETTINGS_KEY, JSON.stringify({ hidden: ["b"], order: ["c", "a"] }));
    const settings = readSectionSettings(cache);
    expect(visibleSections([section("a"), section("b"), section("c")], settings).map((s) => s.sectionId)).toEqual([
      "c",
      "a",
    ]);
  });

  it.each(["not json", JSON.stringify({ hidden: "b" }), "undefined"])("falls back to defaults for %s", (raw) => {
    const cache = new Cache();
    cache.set(SECTION_SETTINGS_KEY, raw);
    expect(readSectionSettings(cache)).toEqual({ hidden: [], order: [] });
  });

  it("uses defaults when nothing was saved", () => {
    expect(readSectionSettings(new Cache())).toEqual({ hidden: [], order: [] });
  });
});
