import { describe, expect, it } from "vitest";

import { asEntityId, assignedToWhere, literal, searchWhere } from "./queries";

describe("literal", () => {
  it("wraps a plain value in quotes", () => {
    expect(literal("login page")).toBe("'login page'");
  });

  it("escapes an embedded quote rather than ending the string early", () => {
    expect(literal("it's broken")).toBe("'it\\'s broken'");
  });

  it("escapes backslashes before quotes, so a trailing backslash cannot escape the delimiter", () => {
    expect(literal("path\\")).toBe("'path\\\\'");
    expect(literal("a\\'b")).toBe("'a\\\\\\'b'");
  });

  it("drops control characters instead of passing them to the parser", () => {
    expect(literal(["line", "break"].join("\n"))).toBe("'linebreak'");
    expect(literal(`tab${String.fromCharCode(9)}here`)).toBe("'tabhere'");
    expect(literal(`del${String.fromCharCode(127)}here`)).toBe("'delhere'");
  });

  it("leaves other punctuation alone", () => {
    expect(literal('a "quoted" (thing) - 50%')).toBe(`'a "quoted" (thing) - 50%'`);
  });
});

describe("asEntityId", () => {
  it("recognises a bare number", () => {
    expect(asEntityId("145322")).toBe(145322);
  });

  it("ignores surrounding whitespace", () => {
    expect(asEntityId("  145322 ")).toBe(145322);
  });

  it("rejects anything that is not purely digits", () => {
    expect(asEntityId("US-145322")).toBeNull();
    expect(asEntityId("145322 login")).toBeNull();
    expect(asEntityId("12.5")).toBeNull();
    expect(asEntityId("-5")).toBeNull();
    expect(asEntityId("")).toBeNull();
  });

  it("rejects zero and absurdly long digit strings", () => {
    expect(asEntityId("0")).toBeNull();
    expect(asEntityId("1234567890123")).toBeNull();
  });
});

describe("searchWhere", () => {
  it("hides final states by default", () => {
    expect(searchWhere("login")).toBe("(Name contains 'login') and (EntityState.IsFinal eq 'false')");
  });

  it("includes them when asked", () => {
    expect(searchWhere("login", { includeFinal: true })).toBe("(Name contains 'login')");
  });

  it("escapes the term it is given", () => {
    expect(searchWhere("it's", { includeFinal: true })).toBe("(Name contains 'it\\'s')");
  });

  it("trims the term", () => {
    expect(searchWhere("  login  ", { includeFinal: true })).toBe("(Name contains 'login')");
  });
});

describe("assignedToWhere", () => {
  it("filters by user and hides final states by default", () => {
    expect(assignedToWhere(42)).toBe("(AssignedUser.Id eq 42) and (EntityState.IsFinal eq 'false')");
  });

  it("includes final states when asked", () => {
    expect(assignedToWhere(42, { includeFinal: true })).toBe("(AssignedUser.Id eq 42)");
  });
});
