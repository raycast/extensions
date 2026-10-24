import { describe, expect, it } from "vitest";
import { parseLine, serializeTask, stripMetadataFromDescription, stripTagsFromDescription } from "./parser";

describe("stripMetadataFromDescription", () => {
  it("removes key:value tokens but keeps +project and @context", () => {
    expect(stripMetadataFromDescription("Call dentist +health @phone due:2026-05-20")).toBe(
      "Call dentist +health @phone",
    );
  });

  it("returns the original when no key:value tokens", () => {
    expect(stripMetadataFromDescription("Buy milk +grocery @errands")).toBe("Buy milk +grocery @errands");
  });

  it("returns empty string for empty input", () => {
    expect(stripMetadataFromDescription("")).toBe("");
  });

  it("preserves email addresses (@ mid-token is not a context)", () => {
    expect(stripMetadataFromDescription("Email alice@example.com")).toBe("Email alice@example.com");
  });
});

describe("parseLine", () => {
  it("parses a bare description with no priority and no tags", () => {
    const t = parseLine("Buy milk", 0);
    expect(t.priority).toBeUndefined();
    expect(t.description).toBe("Buy milk");
    expect(t.completed).toBe(false);
    expect(t.projects).toEqual([]);
    expect(t.contexts).toEqual([]);
    expect(t.metadata).toEqual({});
    expect(t.raw).toBe("Buy milk");
    expect(t.lineNumber).toBe(0);
  });

  it("parses priority", () => {
    const t = parseLine("(A) Call dentist", 0);
    expect(t.priority).toBe("A");
    expect(t.description).toBe("Call dentist");
  });

  it("parses completed flag with completion date and creation date", () => {
    const t = parseLine("x 2026-05-14 2026-05-10 Buy milk", 0);
    expect(t.completed).toBe(true);
    expect(t.completionDate).toBe("2026-05-14");
    expect(t.creationDate).toBe("2026-05-10");
    expect(t.description).toBe("Buy milk");
  });

  it("parses incomplete task with creation date only", () => {
    const t = parseLine("2026-05-10 Buy milk", 0);
    expect(t.completed).toBe(false);
    expect(t.creationDate).toBe("2026-05-10");
    expect(t.completionDate).toBeUndefined();
    expect(t.description).toBe("Buy milk");
  });

  it("parses completed task with completion date only (no creation date)", () => {
    const t = parseLine("x 2026-05-14 Buy milk", 0);
    expect(t.completed).toBe(true);
    expect(t.completionDate).toBe("2026-05-14");
    expect(t.creationDate).toBeUndefined();
    expect(t.description).toBe("Buy milk");
  });

  it("parses priority preserved on completed task", () => {
    const t = parseLine("x 2026-05-14 (A) 2026-05-10 Call dentist", 0);
    expect(t.completed).toBe(true);
    expect(t.priority).toBe("A");
    expect(t.completionDate).toBe("2026-05-14");
    expect(t.creationDate).toBe("2026-05-10");
    expect(t.description).toBe("Call dentist");
  });

  it("does not treat uppercase X as completion marker", () => {
    const t = parseLine("X 2026-05-14 Capital X is not completion", 0);
    expect(t.completed).toBe(false);
    expect(t.description).toBe("X 2026-05-14 Capital X is not completion");
  });

  it("parses completed task with no dates", () => {
    const t = parseLine("x Buy milk", 0);
    expect(t.completed).toBe(true);
    expect(t.completionDate).toBeUndefined();
    expect(t.creationDate).toBeUndefined();
    expect(t.description).toBe("Buy milk");
  });

  it("extracts projects, contexts, and key:value metadata, leaving them in description", () => {
    const t = parseLine("(A) Call dentist +health @phone due:2026-05-20", 0);
    expect(t.projects).toEqual(["health"]);
    expect(t.contexts).toEqual(["phone"]);
    expect(t.metadata).toEqual({ due: "2026-05-20" });
    expect(t.description).toBe("Call dentist +health @phone due:2026-05-20");
  });

  it("handles multiple projects and contexts in any order", () => {
    const t = parseLine("Email +work @computer +urgent @phone", 0);
    expect(t.projects).toEqual(["work", "urgent"]);
    expect(t.contexts).toEqual(["computer", "phone"]);
  });

  it("ignores tag-like substrings that aren't standalone tokens", () => {
    const t = parseLine("Email alice@example.com about C++ thing", 0);
    expect(t.projects).toEqual([]);
    expect(t.contexts).toEqual([]);
  });
});

describe("serializeTask", () => {
  it("round-trips a fully-featured line", () => {
    const line = "(A) 2026-05-10 Call dentist +health @phone due:2026-05-20";
    const t = parseLine(line, 0);
    expect(serializeTask(t)).toBe(line);
  });

  it("round-trips a completed task (no priority — todo.txt spec)", () => {
    const line = "x 2026-05-14 2026-05-10 Call dentist +health";
    const t = parseLine(line, 0);
    expect(serializeTask(t)).toBe(line);
  });

  it("drops priority on serialize for completed tasks (todo.txt spec compliance)", () => {
    // Parser still accepts non-conformant input like `x date (A) date description`
    // for legacy/cross-tool compatibility, but the serializer normalizes it.
    const t = parseLine("x 2026-05-14 (A) 2026-05-10 Call dentist", 0);
    expect(t.priority).toBe("A");
    expect(serializeTask(t)).toBe("x 2026-05-14 2026-05-10 Call dentist");
  });

  it("serializes a task constructed from fields (description only)", () => {
    expect(
      serializeTask({
        raw: "",
        completed: false,
        description: "Buy milk",
        projects: [],
        contexts: [],
        metadata: {},
        lineNumber: -1,
      }),
    ).toBe("Buy milk");
  });
});

describe("parseLine tolerance", () => {
  it("preserves malformed lines via raw and treats whole line as description", () => {
    const garbage = "((not a valid))) priority line";
    const t = parseLine(garbage, 0);
    expect(t.raw).toBe(garbage);
    expect(t.description).toBe(garbage);
    expect(t.priority).toBeUndefined();
  });

  it("never throws on empty string", () => {
    const t = parseLine("", 0);
    expect(t.description).toBe("");
    expect(t.raw).toBe("");
  });
});

describe("stripTagsFromDescription", () => {
  it("removes +project, @context, and key:value tokens", () => {
    expect(stripTagsFromDescription("Call dentist +health @phone due:2026-05-20")).toBe("Call dentist");
  });

  it("collapses internal whitespace left after removing tokens", () => {
    expect(stripTagsFromDescription("Email +work alice about +urgent project")).toBe("Email alice about project");
  });

  it("returns empty string when input is only tags", () => {
    expect(stripTagsFromDescription("+work @home due:2026-05-01")).toBe("");
  });

  it("preserves non-tag tokens that look tag-ish", () => {
    expect(stripTagsFromDescription("Email alice@example.com about C++")).toBe("Email alice@example.com about C++");
  });

  it("returns the original on empty input", () => {
    expect(stripTagsFromDescription("")).toBe("");
  });
});
