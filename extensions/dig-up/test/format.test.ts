import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  approximately,
  baseName,
  bytes,
  clock,
  dirName,
  escapeMarkdown,
  excerptMarkdown,
  extensionOf,
  foundWordsOf,
  formatCount,
  inflects,
  isRightToLeft,
  languageOf,
  markWords,
  matchesOf,
  normalizedText,
  passageWindow,
  plural,
  roughBytes,
  roughDuration,
  shortDate,
  shortTime,
  stripMarks,
  tildePath,
  timeLeft,
} from "../src/lib/format";

function words(text: string, word: string): string[] {
  return matchesOf(word, text).map(([a, b]) => text.slice(a, b));
}

describe("clock", () => {
  test("m:ss under an hour, h:mm:ss from an hour", () => {
    assert.equal(clock(0), "0:00");
    assert.equal(clock(6), "0:06");
    assert.equal(clock(6.9), "0:06");
    assert.equal(clock(25), "0:25");
    assert.equal(clock(65), "1:05");
    assert.equal(clock(3599), "59:59");
    assert.equal(clock(3600), "1:00:00");
    assert.equal(clock(3725), "1:02:05");
    assert.equal(clock(36000), "10:00:00");
  });
});

describe("sizes and durations", () => {
  test("bytes follows ByteCountFormatter's file style", () => {
    assert.equal(bytes(1), "1 byte");
    assert.equal(bytes(512), "512 bytes");
    assert.equal(bytes(2048), "2 KB");
    assert.equal(bytes(63_000), "63 KB");
    assert.equal(bytes(2_100_000), "2.1 MB");
    assert.equal(bytes(2_000_000), "2 MB");
    assert.equal(bytes(23_400_000), "23 MB");
    assert.equal(bytes(1_200_000_000), "1.2 GB");
  });

  test("roughDuration and approximately keep DigUp's precision", () => {
    assert.equal(roughDuration(8), "8 s");
    assert.equal(roughDuration(89), "89 s");
    assert.equal(roughDuration(120), "2 min");
    assert.equal(roughDuration(5399), "90 min");
    assert.equal(roughDuration(5400), "1.5 h");
    assert.equal(approximately(0.2), "< 1 s");
    assert.equal(approximately(240), "≈ 4 min");
    assert.equal(approximately(8), "≈ 8 s");
  });

  test("roughBytes shows one unit, rounded", () => {
    assert.equal(roughBytes(500_000), "500 KB");
    assert.equal(roughBytes(5_400_000), "5.4 MB");
    assert.equal(roughBytes(40_300_000), "40 MB");
    assert.equal(roughBytes(1_200_000_000), "1.2 GB");
  });

  test("timeLeft", () => {
    assert.equal(timeLeft(30), "less than a minute left");
    assert.equal(timeLeft(180), "about 3 min left");
  });

  test("counts", () => {
    assert.equal(formatCount(1234567), "1,234,567");
    assert.equal(plural(1, "file"), "1 file");
    assert.equal(plural(2, "file"), "2 files");
    assert.equal(plural(1200, "long file"), "1,200 long files");
  });

  test("shortDate is the abbreviated date", () => {
    assert.equal(shortDate(new Date(2026, 9, 1, 12, 0, 0).getTime() / 1000), "Oct 1, 2026");
  });

  test("shortTime is the time of day, as DigUp's “indexing from 1:00 AM”", () => {
    assert.equal(shortTime(new Date(2026, 9, 2, 1, 0, 0).getTime()), "1:00 AM");
    assert.equal(shortTime(new Date(2026, 9, 2, 22, 30, 0).getTime()), "10:30 PM");
    assert.equal(shortTime(new Date(2026, 9, 2, 0, 5, 0).getTime()), "12:05 AM");
  });
});

describe("paths", () => {
  test("tildePath", () => {
    assert.equal(tildePath("/Users/me/Downloads/Shots", "/Users/me"), "~/Downloads/Shots");
    assert.equal(tildePath("/Users/me", "/Users/me"), "~");
    assert.equal(tildePath("/Users/meh/x", "/Users/me"), "/Users/meh/x");
    assert.equal(tildePath("/Volumes/Data/x", "/Users/me"), "/Volumes/Data/x");
  });

  test("baseName, dirName and extensionOf", () => {
    assert.equal(baseName("/a/b/c.txt"), "c.txt");
    assert.equal(baseName("/a/b/"), "b");
    assert.equal(dirName("/a/b/c.txt"), "/a/b");
    assert.equal(dirName("/c.txt"), "/");
    assert.equal(extensionOf("/a/Photo.HEIC"), "heic");
    assert.equal(extensionOf("/a/.hidden"), "");
  });

  test("languageOf names what an extension is written in", () => {
    assert.equal(languageOf("/r/billing/retry.py"), "Python");
    assert.equal(languageOf("/r/app.ts"), "TypeScript");
    assert.equal(languageOf("/r/Makefile"), "Makefile");
    assert.equal(languageOf("/r/Dockerfile.dev"), "Dockerfile.dev");
    assert.equal(languageOf("/r/notes"), "Text");
    assert.equal(languageOf("/r/data.zzz"), "ZZZ");
    assert.equal(languageOf("/r/README.md"), "Markdown");
    assert.equal(languageOf("/r/constructor"), "Text");
  });
});

describe("SearchText.normalized (DigUp's own cases)", () => {
  test("Arabic the way people type it", () => {
    assert.equal(normalizedText("الْمَكْتَبَةَ"), "المكتبة");
    assert.equal(normalizedText("إلى الأردن"), "الى الاردن");
    assert.equal(normalizedText("مـــرحبا"), "مرحبا");
    assert.equal(normalizedText("ﻻ"), "لا");
  });

  test("compatibility forms, joiners and zero-width spaces", () => {
    assert.equal(normalizedText("ﬁle"), "file");
    assert.equal(normalizedText("র‍্যাব"), "র্যাব");
    assert.equal(normalizedText("ো"), "ো");
    assert.equal(normalizedText("a​b"), "a b");
  });

  test("inflects marks Bengali, Hindi and Arabic", () => {
    assert.equal(inflects("কুমির"), true);
    assert.equal(inflects("مدرسة"), true);
    assert.equal(inflects("school"), false);
  });
});

describe("matchesOf", () => {
  test("finds whole words, ignoring case and accents", () => {
    assert.deepEqual(words("Payment failed: your card was declined", "card"), ["card"]);
    assert.deepEqual(words("Payment failed", "PAYMENT"), ["Payment"]);
    assert.deepEqual(words("Let's meet at the Café on Friday", "cafe"), ["Café"]);
    assert.deepEqual(words("the cafe and the café", "café"), ["cafe", "café"]);
  });

  test("never matches inside a word", () => {
    assert.deepEqual(words("category", "cat"), []);
    assert.deepEqual(words("the cat sat", "cat"), ["cat"]);
    assert.deepEqual(words("concatenate", "cat"), []);
  });

  test("a word that attaches endings marks the whole word it starts", () => {
    assert.deepEqual(words("কুমিরও এখানে", "কুমির"), ["কুমিরও"]);
    assert.deepEqual(words("المدرسة جميلة", "المدرس"), ["المدرسة"]);
    assert.deepEqual(words("a plant planted", "plant"), ["plant"]);
  });

  test("offsets are UTF-16 offsets into the original text", () => {
    const text = "😀 find me";
    const [[a, b]] = matchesOf("find", text);
    assert.equal(text.slice(a, b), "find");
  });

  test("returns ranges in order, and honors the limit", () => {
    assert.equal(matchesOf("a1", "a1 a1 a1 a1").length, 4);
    assert.equal(matchesOf("a1", "a1 a1 a1 a1", 2).length, 2);
    assert.deepEqual(matchesOf("", "x"), []);
    assert.deepEqual(matchesOf("x", ""), []);
  });
});

describe("marked words", () => {
  test("foundWordsOf reads the « » marks, once each", () => {
    assert.deepEqual(foundWordsOf("has «payment» and «error» then «payment» again"), ["payment", "error"]);
    assert.deepEqual(foundWordsOf(null), []);
    assert.deepEqual(foundWordsOf("no marks"), []);
    assert.deepEqual(foundWordsOf("half «open"), []);
  });

  test("stripMarks", () => {
    assert.equal(stripMarks("a «b» c"), "a b c");
  });

  test("excerptMarkdown turns marks into bold and escapes the rest", () => {
    assert.equal(excerptMarkdown("«Payment» failed for *Acme* #12"), "**Payment** failed for \\*Acme\\* \\#12");
    assert.equal(excerptMarkdown("…the «invoice» is <b>due</b>…"), "…the **invoice** is \\<b\\>due\\</b\\>…");
  });

  test("escapeMarkdown keeps list markers literal", () => {
    assert.equal(escapeMarkdown("1. first"), "1\\. first");
    assert.equal(escapeMarkdown("- item"), "\\- item");
    assert.equal(escapeMarkdown("a_b [c](d)"), "a\\_b \\[c\\](d)");
  });

  test("markWords bolds every match and leaves the rest escaped", () => {
    assert.equal(markWords("Pay the invoice now", ["invoice"]), "Pay the **invoice** now");
    assert.equal(markWords("Invoice and invoices", ["invoice"]), "**Invoice** and invoices");
    assert.equal(markWords("a * b invoice", ["invoice", "x"]), "a \\* b **invoice**");
    assert.equal(markWords("nothing here", ["zebra"]), "nothing here");
  });

  test("words of one character are ignored", () => {
    assert.equal(markWords("a b c", ["a"]), "a b c");
  });
});

describe("passageWindow", () => {
  const filler = (n: number) => "lorem ipsum ".repeat(Math.ceil(n / 12)).slice(0, n);

  test("a match near the start keeps the start", () => {
    const source = `${filler(100)} invoice ${filler(2000)}`;
    const passage = passageWindow(source, ["invoice"]);
    assert.equal(passage.leading, false);
    assert.equal(passage.trailing, true);
    assert.equal(passage.text.length, 900);
  });

  test("a match past character 200 starts 160 characters before it", () => {
    const source = `${filler(500)} invoice ${filler(2000)}`;
    const passage = passageWindow(source, ["invoice"]);
    assert.equal(passage.leading, true);
    assert.ok(passage.text.includes("invoice"));
    const at = passage.text.indexOf("invoice");
    assert.ok(at >= 100 && at <= 170, `match at ${at}`);
    assert.ok(passage.text.length <= 900);
  });

  test("a short text is shown whole", () => {
    const passage = passageWindow("Short passage with a zebra.", ["zebra"]);
    assert.deepEqual(passage, { text: "Short passage with a zebra.", leading: false, trailing: false });
  });

  test("no match shows the beginning", () => {
    const passage = passageWindow(filler(1500), ["zebra"]);
    assert.equal(passage.leading, false);
    assert.equal(passage.trailing, true);
  });
});

test("isRightToLeft reads the first letter", () => {
  assert.equal(isRightToLeft("مرحبا بالعالم"), true);
  assert.equal(isRightToLeft("hello"), false);
  assert.equal(isRightToLeft("123 שלום"), true);
  assert.equal(isRightToLeft(""), false);
});
