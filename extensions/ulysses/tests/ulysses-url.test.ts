import { describe, expect, it } from "vitest";
import {
  createGroupUrl,
  journalSheetText,
  journalSheetUrl,
  newGroupUrl,
  newSheetUrl,
  saveSheetUrl,
  sheetText,
  splitGroupPath,
  ulyssesUrl,
} from "../src/ulysses-url";

function params(url: string) {
  return Object.fromEntries(new URL(url).searchParams);
}

describe("ulyssesUrl", () => {
  it("leaves out empty parameters", () => {
    expect(ulyssesUrl("open-all")).toBe("ulysses://x-callback-url/open-all");
    expect(ulyssesUrl("new-sheet", { text: "", group: undefined })).toBe("ulysses://x-callback-url/new-sheet");
  });

  it("encodes characters that would break the query", () => {
    const url = ulyssesUrl("new-group", { name: "Drafts & Notes #1?" });
    expect(url).toBe("ulysses://x-callback-url/new-group?name=Drafts%20%26%20Notes%20%231%3F");
    expect(params(url).name).toBe("Drafts & Notes #1?");
  });
});

describe("sheetText", () => {
  it("adds the title as a Markdown heading", () => {
    expect(sheetText("Ideas", "First line\nSecond line", "markdown")).toBe("# Ideas\nFirst line\nSecond line");
  });

  it("keeps a plain title for plain text", () => {
    expect(sheetText("Ideas", "Body", "text")).toBe("Ideas\nBody");
  });

  it("works with only a title or only text", () => {
    expect(sheetText("  Ideas ", "", "markdown")).toBe("# Ideas");
    expect(sheetText("", "  Body  ", "markdown")).toBe("Body");
  });
});

describe("newSheetUrl", () => {
  it("passes text, group and format, and silent mode when asked", () => {
    const url = newSheetUrl({ text: "Hello world", group: " /Blog/Drafts ", format: "text", silent: true });
    expect(params(url)).toEqual({ text: "Hello world", group: "/Blog/Drafts", format: "text", "silent-mode": "YES" });
  });

  it("uses the Inbox when no group is set", () => {
    expect(params(newSheetUrl({ text: "Hi", group: "  " }))).toEqual({ text: "Hi" });
  });
});

describe("newGroupUrl", () => {
  it("passes the parent group", () => {
    expect(params(newGroupUrl({ name: " Research ", parent: "/Blog" }))).toEqual({ name: "Research", parent: "/Blog" });
  });
});

describe("journalSheetText", () => {
  const now = new Date(2026, 9, 30, 9, 41);

  it("titles the sheet with today's date", () => {
    expect(journalSheetText({ now, locale: "en-US" })).toBe("# Friday, October 30, 2026");
  });

  it("adds the entry below the title", () => {
    expect(journalSheetText({ now, entry: " Shipped the Raycast update ", locale: "en-US" })).toBe(
      "# Friday, October 30, 2026\nShipped the Raycast update",
    );
  });
});

describe("saveSheetUrl", () => {
  it("falls back to the Inbox when the group doesn't exist", () => {
    const url = saveSheetUrl({ text: "Hi", group: "/Blog/Drafts", format: "markdown" });
    expect(params(url).group).toBe("/Blog/Drafts");
    expect(params(params(url)["x-error"])).toEqual({ text: "Hi", format: "markdown" });
  });

  it("needs no fallback for the Inbox", () => {
    expect(params(saveSheetUrl({ text: "Hi" }))).toEqual({ text: "Hi" });
  });
});

describe("createGroupUrl", () => {
  it("falls back to the top level when the parent doesn't exist", () => {
    const url = createGroupUrl({ name: "Research", parent: "/Blog" });
    expect(params(params(url)["x-error"])).toEqual({ name: "Research" });
  });
});

describe("splitGroupPath", () => {
  it("splits a path into parent and name", () => {
    expect(splitGroupPath("/Personal/Journal")).toEqual({ name: "Journal", parent: "/Personal" });
    expect(splitGroupPath("/A/B/Journal")).toEqual({ name: "Journal", parent: "/A/B" });
  });

  it("keeps a top-level group or plain name as is", () => {
    expect(splitGroupPath("/Journal")).toEqual({ name: "Journal" });
    expect(splitGroupPath(" Journal ")).toEqual({ name: "Journal" });
  });
});

describe("journalSheetUrl", () => {
  it("creates the group and then the sheet when the group doesn't exist", () => {
    const url = journalSheetUrl({ text: "# Today", group: "/Personal/Journal" });
    const sheet = { text: "# Today", group: "/Personal/Journal", format: "markdown" };
    const createGroup = params(params(url)["x-error"]);
    expect(createGroup.name).toBe("Journal");
    expect(createGroup.parent).toBe("/Personal");
    expect(params(createGroup["x-success"])).toEqual(sheet);
    expect(new URL(createGroup["x-success"]).pathname).toBe("/new-sheet");
  });
});
