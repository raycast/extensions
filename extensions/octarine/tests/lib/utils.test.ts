import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  expandHome,
  normalizeSearchText,
  normalizeWorkspaceRoots,
  normalizeText,
  splitList,
  tokenize,
} from "@lib/utils";

describe("utils", () => {
  it("normalizes text and tokenizes safely", () => {
    expect(normalizeText("  Team   Standup  ")).toBe("team standup");
    expect(normalizeText()).toBe("");
    expect(tokenize("team   standup   notes")).toEqual(["team", "standup", "notes"]);
    expect(tokenize("")).toEqual([]);
  });

  it("normalizes path strings and expands workspace roots", () => {
    expect(normalizeSearchText("  C:\\Users\\Me\\\\Notes  ")).toBe("c:/users/me/notes");
    expect(expandHome("~")).toBe(os.homedir());
    expect(expandHome("~/Octarine")).toBe(path.join(os.homedir(), "Octarine"));
    expect(expandHome("/tmp/octarine")).toBe("/tmp/octarine");
    expect(splitList(" a, b ,, c ")).toEqual(["a", "b", "c"]);
    expect(normalizeWorkspaceRoots("~/Octarine, ./fixtures/workspaces, ~/Octarine")).toEqual([
      path.normalize(path.join(os.homedir(), "Octarine")),
      path.normalize(path.resolve("./fixtures/workspaces")),
    ]);
  });
});
