import { describe, expect, it } from "vitest";
import {
  insertLink,
  insertTag,
  linkTriggerAt,
  tagTriggerAt,
} from "./completion";

describe("linkTriggerAt", () => {
  it("finds a [[ typed at the end", () => {
    expect(linkTriggerAt("see [", "see [[")).toBe(4);
  });

  it("finds a [[ typed in the middle", () => {
    expect(linkTriggerAt("ab", "a[[b")).toBe(1);
  });

  it("finds a [[ that ends a paste in the middle", () => {
    expect(linkTriggerAt("ab", "ax [[b")).toBe(3);
  });

  it("ignores a second [ that does not start a link", () => {
    expect(linkTriggerAt("[x", "[x[")).toBeUndefined();
  });

  it("ignores a third [ after an open [[", () => {
    expect(linkTriggerAt("[[", "[[[")).toBeUndefined();
  });

  it("ignores deletions", () => {
    expect(linkTriggerAt("a[[b", "a[[")).toBeUndefined();
  });

  it("ignores an unchanged value", () => {
    expect(linkTriggerAt("a[[", "a[[")).toBeUndefined();
  });

  it("ignores a paste that replaces a selection", () => {
    expect(linkTriggerAt("a x", "a [[")).toBeUndefined();
  });
});

describe("tagTriggerAt", () => {
  it("finds # at the start of the field", () => {
    expect(tagTriggerAt("", "#")).toBe(0);
  });

  it("finds # after a space", () => {
    expect(tagTriggerAt("note ", "note #")).toBe(5);
  });

  it("ignores # in the middle of a word", () => {
    expect(tagTriggerAt("note", "note#")).toBeUndefined();
  });

  it("fires on a new line after an abandoned [[ on the line above", () => {
    expect(tagTriggerAt("[[Plan\n", "[[Plan\n#")).toBe(7);
  });

  it("ignores # inside an open link", () => {
    expect(tagTriggerAt("[[Plan ", "[[Plan #")).toBeUndefined();
  });

  it("finds # after a closed link", () => {
    expect(tagTriggerAt("[[Plan]] ", "[[Plan]] #")).toBe(9);
  });

  it("ignores a paste that ends in #", () => {
    expect(tagTriggerAt("a ", "a b #")).toBeUndefined();
  });

  it("ignores deletions", () => {
    expect(tagTriggerAt("a #", "a ")).toBeUndefined();
  });
});

describe("insertLink", () => {
  it("replaces the [[ with the link and keeps the text after it", () => {
    expect(insertLink("a[[b c", 1, "Projects/Plan|Big Plan")).toBe(
      "a[[Projects/Plan|Big Plan]]b c",
    );
  });
});

describe("insertTag", () => {
  it("replaces the # with the tag and keeps the text after it", () => {
    expect(insertTag("a # c", 2, "work")).toBe("a #work c");
  });
});
