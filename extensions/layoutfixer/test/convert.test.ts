import { join } from "path";
import { describe, expect, it } from "vitest";
import { fixText } from "../src/lib/convert";
import { Dictionaries } from "../src/lib/dictionaries";
import { layouts } from "../src/lib/layouts";

const dicts = Dictionaries.load(join(__dirname, "..", "assets"));
const isiri = layouts("isiri2901");
const fix = (text: string, mode: "smart" | "all" = "smart") => fixText(text, dicts, isiri, { mode }).text;

describe("smart mode", () => {
  it("fixes English typed on the Persian layout", () => {
    expect(fix("صشدف فخ لقشذ معدزا فخیشغ")).toBe("want to grab lunch today");
  });

  it("fixes Persian typed on the English layout", () => {
    expect(fix("sghl")).toBe("سلام");
  });

  it("leaves names, brands and typos alone", () => {
    for (const word of ["github", "figma", "teh"]) expect(fix(word)).toBe(word);
  });

  it("leaves correct text alone", () => {
    expect(fix("want to grab lunch today")).toBe("want to grab lunch today");
    expect(fix("سلام دوست من")).toBe("سلام دوست من");
  });

  it("only converts the mistyped part of mixed text", () => {
    expect(fix("check github صشدف فخ لقشذ")).toBe("check github want to grab");
    expect(fix("ok sghl")).toBe("ok سلام");
  });

  it("fixes both directions in one text", () => {
    expect(fix("sghl صشدف فخ لقشذ")).toBe("سلام want to grab");
  });

  it("keeps punctuation and line breaks", () => {
    expect(fix("صشدف فخ لقشذ معدزا فخیشغ؟\nسلام")).toBe("want to grab lunch today?\nسلام");
  });
});

describe("all mode", () => {
  it("converts everything", () => {
    expect(fix("github", "all")).toBe("لهفاعذ");
  });

  it("uses the legacy Persian layout when chosen", () => {
    expect(fixText("ghk", dicts, layouts("persian"), { mode: "all" }).text).toBe("لان");
  });
});
