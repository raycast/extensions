import { describe, expect, it } from "vitest";
import { buildSearchText, querySearchText } from "@lib/search";

type SearchableItem = {
  searchText: string;
};

function createItem({
  title,
  notePath,
  workspaceName = "Workspace",
}: {
  title: string;
  notePath: string;
  workspaceName?: string;
}): SearchableItem {
  return {
    searchText: buildSearchText(title, notePath, workspaceName),
  };
}

describe("querySearchText", () => {
  it("matches empty queries", () => {
    const item = createItem({
      title: "Team Standup",
      notePath: "daily/team-standup.md",
    });

    expect(querySearchText(item, "")).toBe(true);
  });

  it("matches plain multi-token queries against the search index", () => {
    const item = createItem({
      title: "Team Standup",
      notePath: "daily/team-standup.md",
      workspaceName: "Work",
    });

    expect(querySearchText(item, "standup work")).toBe(true);
    expect(querySearchText(item, "standup personal")).toBe(false);
  });

  it("normalizes slash queries before matching", () => {
    const item = createItem({
      title: "Retro",
      notePath: "projects/client-a/meetings/retro.md",
    });

    expect(querySearchText(item, "client-a\\meetings")).toBe(true);
    expect(querySearchText(item, "client-a//meetings")).toBe(true);
    expect(querySearchText(item, "archive/meetings")).toBe(false);
  });
});

describe("buildSearchText", () => {
  it("joins trimmed parts into lowercase search text", () => {
    expect(buildSearchText(" Team Standup ", "daily/team-standup.md", " Work ")).toBe("team standup daily/team-standup.md work");
  });

  it("skips empty parts", () => {
    expect(buildSearchText("Team Standup", undefined, " ")).toBe("team standup");
  });
});
