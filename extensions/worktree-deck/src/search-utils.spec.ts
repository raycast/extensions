import { describe, expect, it } from "vitest";
import { filterActionItemsBySearchTerms, parseSearchTerms, type ActionSearchItem } from "./search-utils";

const actionItems: ActionSearchItem[] = [
  {
    id: "create-worktree",
    title: "Create Worktree",
    keywords: ["worktree", "workspace", "create workspace", "new"],
  },
  {
    id: "settings",
    title: "Settings",
    keywords: ["application", "general", "repository", "repositories", "preferences"],
  },
];

describe("filterActionItemsBySearchTerms", () => {
  it("検索語が空なら全アクションを返す", () => {
    const terms = parseSearchTerms("");
    const result = filterActionItemsBySearchTerms(actionItems, terms);
    expect(result.map((item) => item.id)).toEqual(["create-worktree", "settings"]);
  });

  it("workspace で Create Worktree がヒットする", () => {
    const terms = parseSearchTerms("workspace");
    const result = filterActionItemsBySearchTerms(actionItems, terms);
    expect(result.map((item) => item.id)).toEqual(["create-worktree"]);
  });

  it("repository settings で Settings がヒットする", () => {
    const terms = parseSearchTerms("repository settings");
    const result = filterActionItemsBySearchTerms(actionItems, terms);
    expect(result.map((item) => item.id)).toEqual(["settings"]);
  });

  it.each(["settings", "preferences", "general", "repositories"])("%s で Settings がヒットする", (input) => {
    const terms = parseSearchTerms(input);
    const result = filterActionItemsBySearchTerms(actionItems, terms);
    expect(result.map((item) => item.id)).toEqual(["settings"]);
  });

  it("トークンが別アクションに分散するとヒットしない", () => {
    const terms = parseSearchTerms("worktree settings");
    const result = filterActionItemsBySearchTerms(actionItems, terms);
    expect(result).toEqual([]);
  });
});
