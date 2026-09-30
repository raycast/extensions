import { describe, expect, it } from "vitest";
import { BANNER_CHARS, TALL_CHARS, renderBanner } from "./banner";
import { parseCallouts, renderCallouts } from "./callouts";
import { FORMATS, detectKinds } from "./formats";
import { styleText } from "./textstyle";
import { displayWidth } from "./width";

describe("callouts", () => {
  it("underlines targets and labels them rightmost first", () => {
    expect(
      renderCallouts("const total = items.reduce(sum)\nitems.reduce: throws on an empty array\nsum: no initial value"),
    ).toBe(
      [
        "const total = items.reduce(sum)",
        "              ─────┬────── ─┬─",
        "                   │        ╰── no initial value",
        "                   ╰── throws on an empty array",
      ].join("\n"),
    );
  });

  it("keeps code that contains colons as code", () => {
    const parsed = parseCallouts("function f(a: number) {\n  return a.toFixed(2)\n}\ntoFixed: returns a string");
    expect(parsed?.code).toHaveLength(3);
    expect(parsed?.callouts).toEqual([{ target: "toFixed", note: "returns a string" }]);
  });

  it("accepts a backticked target that contains a colon", () => {
    expect(parseCallouts("let a: number = 1\n`a: number`: widen to bigint")?.callouts[0].target).toBe("a: number");
  });

  it("prefers a whole-word match", () => {
    expect(renderCallouts("const data = a + 1\na: undefined here").split("\n")[1]).toBe("             ┬");
  });

  it("annotates targets on different lines under their own line", () => {
    const out = renderCallouts("x = load()\ny = parse(x)\nload: slow\nparse: throws").split("\n");
    expect(out[0]).toBe("x = load()");
    expect(out[3]).toBe("y = parse(x)");
  });

  it("gives a note whose target isn't in the code back as code", () => {
    expect(parseCallouts("Meeting notes\nagenda: see doc")).toBeUndefined();
  });

  it("is detected first", () => {
    expect(detectKinds("const total = items.reduce(sum)\nsum: no initial value")[0]).toBe("code");
  });
});

describe("text styles", () => {
  it.each([
    ["bold", "Ab1", "𝗔𝗯𝟭"],
    ["italic", "Ab1", "𝘈𝘣1"],
    ["boldItalic", "Ab1", "𝘼𝙗𝟭"],
    ["mono", "Ab1", "𝙰𝚋𝟷"],
  ] as const)("%s maps letters and digits", (style, input, out) => expect(styleText(input, style)).toBe(out));

  it("leaves punctuation, spaces and accented letters alone", () => {
    expect(styleText("é, ok!", "bold")).toBe("é, 𝗼𝗸!");
  });

  it("strikes and underlines without touching spaces, at the same display width", () => {
    const struck = styleText("two words", "strike");
    expect(struck.split(" ")).toHaveLength(2);
    expect(displayWidth(struck)).toBe(9);
    expect(displayWidth(styleText("abc", "underline"))).toBe(3);
  });

  it("is never the first suggestion, and carries a caveat", () => {
    expect(detectKinds("Hello")[0]).not.toBe("text");
    expect(
      FORMATS.filter((f) => f.id.startsWith("text-") && !f.id.startsWith("text-banner")).every((f) => f.caveat),
    ).toBe(true);
  });
});

describe("banner", () => {
  it("draws every glyph as two rows of equal width", () => {
    // A trailing I (a full-height bar) stops trimEnd from hiding a short row.
    for (const ch of BANNER_CHARS) {
      const rows = renderBanner(`I${ch}I`).split("\n");
      expect(rows, ch).toHaveLength(2);
      expect(displayWidth(rows[0]), ch).toBe(displayWidth(rows[1]));
    }
  });

  it("renders known letters", () => {
    expect(renderBanner("hi")).toBe("█ █ █\n█▀█ █");
    expect(renderBanner("OK")).toBe("█▀█ █▄▀\n█▄█ █ █");
  });

  it("puts each input line in its own banner, skipping unknown characters", () => {
    expect(renderBanner("A\nB").split("\n")).toHaveLength(5);
    expect(renderBanner("A€")).toBe(renderBanner("A"));
  });
});

describe("tall banner", () => {
  it("draws every glyph as three rows of equal width", () => {
    for (const ch of TALL_CHARS) {
      // The tall I has serifs, so wrap in H instead: full width on all three rows.
      const rows = renderBanner(`H${ch}H`, { size: "tall", mixedCase: true }).split("\n");
      expect(rows, ch).toHaveLength(3);
      expect(new Set(rows.map(displayWidth)).size, ch).toBe(1);
    }
  });

  it("capitalises unless mixed case is on", () => {
    expect(renderBanner("ab", { size: "tall" })).toBe(renderBanner("AB", { size: "tall" }));
    expect(renderBanner("ab", { size: "tall", mixedCase: true })).not.toBe(renderBanner("AB", { size: "tall" }));
  });

  it("puts descenders in the third row and keeps x-height letters out of the first", () => {
    const [top, , bottom] = renderBanner("gy", { size: "tall", mixedCase: true }).split("\n");
    expect(top.trim()).toBe("");
    expect(bottom).toMatch(/[▄█]/);
  });

  it("ignores mixed case for the small font, which has capitals only", () => {
    expect(renderBanner("ok", { size: "small", mixedCase: true })).toBe(renderBanner("OK"));
  });

  it("offers small, tall caps and tall mixed-case banners in Compose", () => {
    const ids = FORMATS.filter((f) => f.id.startsWith("text-banner")).map((f) => f.id);
    expect(ids).toEqual(["text-banner", "text-banner-tall", "text-banner-tall-mixed"]);
  });
});
