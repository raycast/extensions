import { describe, expect, it } from "vitest";

import { formatDeckHierarchyTitle, hierarchyDecks } from "./deck-hierarchy";

describe("hierarchyDecks", () => {
  it("places child decks beneath their parents in alphabetical order", () => {
    expect(
      hierarchyDecks([
        { id: "child-b", name: "Zeta", parentId: "parent" },
        { id: "other", name: "Other" },
        { id: "parent", name: "Languages" },
        { id: "child-a", name: "Greek", parentId: "parent" },
        { id: "grandchild", name: "Verbs", parentId: "child-a" },
      ])
    ).toEqual([
      { deck: { id: "parent", name: "Languages" }, depth: 0, path: ["Languages"] },
      { deck: { id: "child-a", name: "Greek", parentId: "parent" }, depth: 1, path: ["Languages", "Greek"] },
      {
        deck: { id: "grandchild", name: "Verbs", parentId: "child-a" },
        depth: 2,
        path: ["Languages", "Greek", "Verbs"],
      },
      { deck: { id: "child-b", name: "Zeta", parentId: "parent" }, depth: 1, path: ["Languages", "Zeta"] },
      { deck: { id: "other", name: "Other" }, depth: 0, path: ["Other"] },
    ]);
  });

  it("keeps missing and circular parents visible", () => {
    expect(
      hierarchyDecks([
        { id: "missing-parent", name: "Orphan", parentId: "missing" },
        { id: "first", name: "First", parentId: "second" },
        { id: "second", name: "Second", parentId: "first" },
      ])
    ).toEqual([
      { deck: { id: "missing-parent", name: "Orphan", parentId: "missing" }, depth: 0, path: ["Orphan"] },
      { deck: { id: "first", name: "First", parentId: "second" }, depth: 0, path: ["First"] },
      { deck: { id: "second", name: "Second", parentId: "first" }, depth: 1, path: ["First", "Second"] },
    ]);
  });

  it("formats deck paths with a hierarchy separator", () => {
    expect(formatDeckHierarchyTitle(["English"])).toBe("English");
    expect(formatDeckHierarchyTitle(["English", "Words"])).toBe("English → Words");
    expect(formatDeckHierarchyTitle(["English", "Words", "Verbs"])).toBe("English → Words → Verbs");
  });
});
