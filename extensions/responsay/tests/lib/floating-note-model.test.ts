import { describe, expect, it } from "vitest";
import {
  buildCreateNoteDeeplink,
  buildFloatingNoteText,
  topCoachingBullets,
} from "../../src/lib/floating-note-model";

describe("topCoachingBullets", () => {
  it("returns nothing for missing or blank coaching", () => {
    expect(topCoachingBullets(undefined)).toEqual([]);
    expect(topCoachingBullets("")).toEqual([]);
    expect(topCoachingBullets("   \n  ")).toEqual([]);
  });

  it("strips list markers and caps at the limit (default 2)", () => {
    expect(
      topCoachingBullets("- First point\n- Second point\n- Third point"),
    ).toEqual(["First point", "Second point"]);
  });

  it("honours an explicit limit", () => {
    expect(topCoachingBullets("* a\n* b\n* c", 1)).toEqual(["a"]);
  });

  it("supports dash, asterisk, and bullet-dot markers", () => {
    expect(topCoachingBullets("• dotted")).toEqual(["dotted"]);
    expect(topCoachingBullets("* starred")).toEqual(["starred"]);
  });

  it("keeps a plain line that has no list marker", () => {
    expect(topCoachingBullets("Keep the request polite.")).toEqual([
      "Keep the request polite.",
    ]);
  });

  it("ignores blank lines between bullets", () => {
    expect(topCoachingBullets("- keep\n\n- spaced")).toEqual([
      "keep",
      "spaced",
    ]);
  });
});

describe("buildFloatingNoteText", () => {
  it("renders the expression as a heading on its own", () => {
    expect(
      buildFloatingNoteText({ expression: "Could you send me the file?" }),
    ).toBe("# Could you send me the file?");
  });

  it("trims the expression", () => {
    expect(buildFloatingNoteText({ expression: "  Hello  " })).toBe("# Hello");
  });

  it("adds the source intent as a blockquote", () => {
    expect(
      buildFloatingNoteText({ expression: "Hi there", source: "打招呼" }),
    ).toBe("# Hi there\n\n> 打招呼");
  });

  it("adds up to two coaching bullets", () => {
    expect(
      buildFloatingNoteText({
        expression: "Hi",
        coaching: "- be warm\n- smile\n- third",
      }),
    ).toBe("# Hi\n\n- be warm\n- smile");
  });

  it("composes expression, source, and coaching in order", () => {
    expect(
      buildFloatingNoteText({
        expression: "Hi",
        source: "打招呼",
        coaching: "- be warm\n- smile\n- third",
      }),
    ).toBe("# Hi\n\n> 打招呼\n\n- be warm\n- smile");
  });

  it("omits blank source and coaching", () => {
    expect(
      buildFloatingNoteText({ expression: "Hi", source: "   ", coaching: "" }),
    ).toBe("# Hi");
  });
});

describe("buildCreateNoteDeeplink", () => {
  it("targets the built-in Raycast Notes create-note command", () => {
    expect(buildCreateNoteDeeplink("hello")).toMatch(
      /^raycast:\/\/extensions\/raycast\/raycast-notes\/create-note\?fallbackText=/,
    );
  });

  it("encodes spaces as %20, not + (Raycast shows literal + otherwise)", () => {
    const url = buildCreateNoteDeeplink("a b");
    expect(url).toContain("fallbackText=a%20b");
    expect(url).not.toContain("+");
  });

  it("round-trips arbitrary text via percent-encoding", () => {
    const text = "# Hi\n\n> 你好 world#1";
    const encoded = buildCreateNoteDeeplink(text).split("fallbackText=")[1];
    expect(decodeURIComponent(encoded)).toBe(text);
  });
});
