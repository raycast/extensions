import { describe, expect, it } from "vitest";
import { applyPrefs, moveProfile, orderedIds, parsePrefs, toggleHidden } from "../../src/lib/profile-prefs";

const items = ["codex", "claude", "gemini"].map((profile) => ({ profile }));
const ids = (list: { profile: string }[]) => list.map((item) => item.profile);

describe("profile prefs", () => {
  it("parses saved prefs defensively", () => {
    expect(parsePrefs(undefined)).toEqual({ order: [], hidden: [] });
    expect(parsePrefs("not json")).toEqual({ order: [], hidden: [] });
    expect(parsePrefs('{"order":["claude",3],"hidden":"x"}')).toEqual({ order: ["claude"], hidden: [] });
  });

  it("keeps Claude Usage order when nothing is saved", () => {
    expect(ids(applyPrefs(items, { order: [], hidden: [] }))).toEqual(["codex", "claude", "gemini"]);
  });

  it("applies saved order and appends new profiles", () => {
    expect(orderedIds({ order: ["gemini", "claude", "removed"], hidden: [] }, ["codex", "claude", "gemini"])).toEqual([
      "gemini",
      "claude",
      "codex",
    ]);
  });

  it("filters hidden profiles", () => {
    const prefs = { order: ["gemini", "claude"], hidden: ["codex"] };
    expect(ids(applyPrefs(items, prefs))).toEqual(["gemini", "claude"]);
  });

  it("shows a single profile for quicklinks, even if hidden", () => {
    expect(ids(applyPrefs(items, { order: [], hidden: ["claude"] }, "claude"))).toEqual(["claude"]);
    expect(applyPrefs(items, { order: [], hidden: [] }, "missing")).toEqual([]);
  });

  it("moves profiles within bounds", () => {
    const available = ["codex", "claude", "gemini"];
    const prefs = { order: [], hidden: [] };
    expect(moveProfile(prefs, available, "claude", -1).order).toEqual(["claude", "codex", "gemini"]);
    expect(moveProfile(prefs, available, "gemini", 1).order).toEqual(["codex", "claude", "gemini"]);
    expect(moveProfile(prefs, available, "codex", -1).order).toEqual(["codex", "claude", "gemini"]);
  });

  it("toggles visibility", () => {
    const hidden = toggleHidden({ order: [], hidden: [] }, "codex");
    expect(hidden.hidden).toEqual(["codex"]);
    expect(toggleHidden(hidden, "codex").hidden).toEqual([]);
  });
});
