import { describe, expect, it } from "vitest";

import { parseCommand } from "./command";

describe("parseCommand", () => {
  it.each([
    ["", { kind: "toc", filter: "" }],
    ["intro", { kind: "toc", filter: "intro" }],
    [":", { kind: "toc", filter: "" }],
    [":toc", { kind: "toc", filter: "" }],
    [":12", { kind: "page", page: 12 }],
    [": c3", { kind: "chapter", chapter: 3 }],
    [":bm", { kind: "bookmarks" }],
    [":bookmarks", { kind: "bookmarks" }],
    [":theme", { kind: "theme", name: null }],
    [":theme Mua", { kind: "theme", name: "mua" }],
    ["/ kiều ", { kind: "search", query: "kiều" }],
    ["/", { kind: "search", query: "" }],
    [":wat", { kind: "unknown", input: ":wat" }],
  ])("parses %j", (input, expected) => {
    expect(parseCommand(input)).toEqual(expected);
  });
});
