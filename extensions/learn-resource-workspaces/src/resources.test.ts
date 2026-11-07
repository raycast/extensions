import { describe, expect, it } from "vitest";
import os from "node:os";
import {
  EMPTY_FILTERS,
  filterResources,
  normalizeResourceSource,
  parseTags,
  parseWorkspaceResources,
  resourceOutputPath,
  shellQuote,
  type LearnResource,
} from "./resources.js";

const resources: LearnResource[] = [
  {
    source: "https://example.com/agents",
    title: "Browser Agents",
    type: "web",
    status: "pending",
    tags: ["AI", "reading"],
  },
  {
    source: "/notes/agents.pdf",
    type: "pdf",
    status: "ingested",
    tags: ["AI"],
    output: "pdf/agents.md",
  },
  {
    source: "https://example.com/other",
    title: "Notes",
    type: "web",
    status: "failed",
    tags: ["ai"],
  },
];
describe("resource browsing", () => {
  it("combines query terms with status/type/exact-case tag filters", () => {
    expect(
      filterResources(
        resources,
        { status: "pending", type: "web", tag: "AI" },
        "browser reading",
      ),
    ).toEqual([resources[0]]);
    expect(
      filterResources(resources, { ...EMPTY_FILTERS, tag: "ai" }, ""),
    ).toEqual([resources[2]]);
    expect(filterResources(resources, EMPTY_FILTERS, "agents")).toEqual(
      resources.slice(0, 2),
    );
    expect(
      filterResources(resources, { ...EMPTY_FILTERS, type: "pdf" }, "browser"),
    ).toEqual([]);
  });
  it("validates the JSON contract and resolves outputs from workspace paths", () => {
    const data = {
      workspace: "papers",
      path: "/custom/learn/papers",
      resources,
    };
    expect(parseWorkspaceResources(JSON.stringify(data), "papers")).toEqual(
      data,
    );
    expect(resourceOutputPath(data.path, resources[1].output!)).toBe(
      "/custom/learn/papers/pdf/agents.md",
    );
    expect(() =>
      parseWorkspaceResources(
        JSON.stringify({ ...data, workspace: "other" }),
        "papers",
      ),
    ).toThrow();
    expect(() =>
      parseWorkspaceResources(
        JSON.stringify({
          ...data,
          resources: [{ ...resources[0], tags: [3] }],
        }),
        "papers",
      ),
    ).toThrow();
    expect(() =>
      parseWorkspaceResources(
        JSON.stringify({ ...data, path: "relative" }),
        "papers",
      ),
    ).toThrow();
  });
  it("normalizes local paths without changing URL identifiers", () => {
    expect(normalizeResourceSource(" ~/notes/My Book.pdf ")).toBe(
      `${os.homedir()}/notes/My Book.pdf`,
    );
    expect(normalizeResourceSource(" https://example.com/a?x=1&y=2 ")).toBe(
      "https://example.com/a?x=1&y=2",
    );
    for (const value of [
      "",
      "notes/file",
      "javascript:alert(1)",
      "file:///tmp/a",
    ])
      expect(() => normalizeResourceSource(value)).toThrow();
    expect(parseTags(" AI, reading,AI, , 中文 ")).toEqual([
      "AI",
      "reading",
      "中文",
    ]);
  });
  it("quotes shell metacharacters as literal arguments", () => {
    expect(shellQuote("papers'; $(touch /tmp/bad) `id`\n")).toBe(
      "'papers'\\''; $(touch /tmp/bad) `id`\n'",
    );
  });
});
