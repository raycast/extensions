import { describe, expect, it } from "vitest";
import { applyPrefs, moveProvider, orderedIds, parsePrefs, toggleHidden } from "../../src/lib/provider-prefs";

const items = ["codex", "claude", "gemini"].map((provider) => ({ provider }));
const ids = (list: { provider: string }[]) => list.map((item) => item.provider);

describe("provider prefs", () => {
  it("parses saved prefs defensively", () => {
    expect(parsePrefs(undefined)).toEqual({ order: [], hidden: [] });
    expect(parsePrefs("not json")).toEqual({ order: [], hidden: [] });
    expect(parsePrefs('{"order":["claude",3],"hidden":"x"}')).toEqual({ order: ["claude"], hidden: [] });
  });

  it("keeps CodexBar order when nothing is saved", () => {
    expect(ids(applyPrefs(items, { order: [], hidden: [] }))).toEqual(["codex", "claude", "gemini"]);
  });

  it("applies saved order and appends new providers", () => {
    expect(orderedIds({ order: ["gemini", "claude", "removed"], hidden: [] }, ["codex", "claude", "gemini"])).toEqual([
      "gemini",
      "claude",
      "codex",
    ]);
  });

  it("filters hidden providers", () => {
    const prefs = { order: ["gemini", "claude"], hidden: ["codex"] };
    expect(ids(applyPrefs(items, prefs))).toEqual(["gemini", "claude"]);
  });

  it("shows a single provider for quicklinks, even if hidden", () => {
    expect(ids(applyPrefs(items, { order: [], hidden: ["claude"] }, "claude"))).toEqual(["claude"]);
    expect(applyPrefs(items, { order: [], hidden: [] }, "missing")).toEqual([]);
  });

  it("moves providers within bounds", () => {
    const available = ["codex", "claude", "gemini"];
    const prefs = { order: [], hidden: [] };
    expect(moveProvider(prefs, available, "claude", -1).order).toEqual(["claude", "codex", "gemini"]);
    expect(moveProvider(prefs, available, "gemini", 1).order).toEqual(["codex", "claude", "gemini"]);
    expect(moveProvider(prefs, available, "codex", -1).order).toEqual(["codex", "claude", "gemini"]);
  });

  it("toggles visibility", () => {
    const hidden = toggleHidden({ order: [], hidden: [] }, "codex");
    expect(hidden.hidden).toEqual(["codex"]);
    expect(toggleHidden(hidden, "codex").hidden).toEqual([]);
  });
});
