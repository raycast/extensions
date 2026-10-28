import { join } from "path";
import { describe, expect, it } from "vitest";
import { fixText } from "../src/lib/convert";
import { Dictionaries } from "../src/lib/dictionaries";
import { layouts } from "../src/lib/layouts";
import { ALL_CLEANUP, cleanUpPersian } from "../src/lib/persian";
import { replaceWords, Speller } from "../src/lib/spelling";

const dicts = Dictionaries.load(join(__dirname, "..", "assets"));
const pair = layouts("isiri2901");
const speller = new Speller(dicts);

describe("caps lock", () => {
  it("fixes inverted case", () => {
    expect(fixText("hELLO there", dicts, pair).text).toBe("Hello there");
  });

  it("reads Persian typed with caps lock", () => {
    expect(fixText("SGHL", dicts, pair).text).toBe("سلام");
  });

  it("leaves real acronyms alone", () => {
    expect(fixText("NASA and FBI", dicts, pair).text).toBe("NASA and FBI");
  });

  it("can be turned off", () => {
    expect(fixText("hELLO", dicts, pair, { capsLock: false }).text).toBe("hELLO");
  });
});

describe("sentences", () => {
  it("includes short words next to a mistake", () => {
    expect(fixText("lk ldo,hl fvl o,ki", dicts, pair).text).toBe("من میخوام برم خونه");
  });

  it("fixes a mistake inside a correct sentence", () => {
    expect(fixText("من دارم فاهس هس ش فثسف میکنم", dicts, pair).text).toBe("من دارم this is a test میکنم");
    expect(fixText("hello sghl o,fd", dicts, pair).text).toBe("hello سلام خوبی");
  });

  it("leaves URLs and correct sentences alone", () => {
    for (const s of ["check out this link: github.com/foo", "سلام دوست عزیزم، حالت چطوره؟", "meet tomorrow at 5"])
      expect(fixText(s, dicts, pair).text).toBe(s);
  });
});

describe("half-spaces", () => {
  it("treats words with a half-space as real Persian words", () => {
    expect(dicts.isWord("می‌خوام", "fa")).toBe(true);
    expect(fixText("می‌خوام", dicts, pair).text).toBe("می‌خوام");
  });
});

describe("fallback and options", () => {
  it("converts everything when asked and nothing looks wrong", () => {
    expect(fixText("github", dicts, pair).text).toBe("github");
    expect(fixText("github", dicts, pair, { fallbackToAll: true }).text).toBe("لهفاعذ");
  });

  it("keeps Latin digits when Persian digits are off", () => {
    expect(fixText("sghl 123", dicts, pair, { mode: "all" }).text).toBe("سلام ۱۲۳");
    expect(fixText("sghl 123", dicts, pair, { mode: "all", persianDigits: false }).text).toBe("سلام 123");
  });

  it("never converts personal dictionary words", () => {
    const d = Dictionaries.load(join(__dirname, "..", "assets"));
    d.setPersonalWords(["sghl"]);
    expect(fixText("sghl", d, pair).text).toBe("sghl");
  });
});

describe("spelling", () => {
  it("suggests English corrections", () => {
    expect(speller.suggest("recieve", "en")[0]).toBe("receive");
    expect(speller.suggest("Teh", "en")[0]).toBe("The");
  });

  it("suggests Persian corrections", () => {
    expect(speller.suggest("کتاپ", "fa")).toContain("کتاب");
  });

  it("finds misspellings and leaves correct words, names and numbers alone", () => {
    const found = speller.check("I recieve the book 2024 github.com NASA");
    expect(found.map((m) => m.word)).toEqual(["recieve"]);
  });

  it("replaces words but keeps punctuation", () => {
    expect(replaceWords("I recieve, ok", new Map([[1, "receive"]]))).toBe("I receive, ok");
  });

  it("auto-corrects converted words only when confident", () => {
    expect(speller.autoCorrect("recieve", "en")).toBe("receive");
    expect(speller.autoCorrect("hello", "en")).toBeUndefined();
  });
});

describe("Persian clean-up", () => {
  const clean = (s: string) => cleanUpPersian(s, ALL_CLEANUP, dicts);

  it("adds half-spaces", () => {
    expect(clean("من می خواهم کتاب ها را ببینم")).toBe("من می‌خواهم کتاب‌ها را ببینم");
    expect(clean("این بزرگ تر است")).toBe("این بزرگ‌تر است");
  });

  it("fixes Arabic letters, punctuation and spaces", () => {
    expect(clean("علي  كجاست ?")).toBe("علی کجاست؟");
    expect(clean("سلام , خوبی")).toBe("سلام، خوبی");
    expect(clean('او گفت "سلام"')).toBe("او گفت «سلام»");
  });

  it("uses Persian digits in Persian sentences but not in URLs or English", () => {
    expect(clean("من 25 سال دارم")).toBe("من ۲۵ سال دارم");
    expect(clean("I am 25")).toBe("I am 25");
    expect(clean("سایت example.com/2024")).toBe("سایت example.com/2024");
  });

  it("leaves English text alone", () => {
    const english = "Hello, world? Yes; ok.";
    expect(clean(english)).toBe(english);
  });
});
