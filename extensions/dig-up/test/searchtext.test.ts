// Ported from DigUp's SearchTextTests.swift (ftsQuery and kindHints belong to the searcher) and the hasWords cases of
// LongFilesTests.swift.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  Graphemes,
  Landmark,
  PageTextProblem,
  SearchText,
  graphemeCount,
  graphemePrefix,
  hasPrefix,
  hasWords,
  inflects,
  lowercased,
  matches,
  normalized,
  snippet,
  trimWhitespace,
  trimWhitespaceAndNewlines,
} from "../engine/searchtext";

function found(word: string, text: string): string[] {
  return matches(word, text).map((range) => text.slice(range.start, range.end));
}

describe("normalized", () => {
  test("folds what is typed differently", () => {
    assert.equal(normalized("الْمَكْتَبَةَ"), "المكتبة"); // harakat
    assert.equal(normalized("إلى الأردن"), "الى الاردن"); // alef forms
    assert.equal(normalized("مـــرحبا"), "مرحبا"); // tatweel
    assert.equal(normalized("ﻻ"), "لا"); // the lam-alef ligature → lam, alef
    assert.equal(normalized("ﬁle"), "file"); // ﬁ
    assert.equal(normalized("র‍্যাব"), "র্যাব"); // zero-width joiner
    assert.equal(normalized("ো"), "ো"); // ে + া → ো
    assert.equal(normalized("a​b"), "a b"); // zero-width space breaks words
  });

  test("composes as Foundation's NFKC does, not quite as Unicode's", () => {
    // Checked against precomposedStringWithCompatibilityMapping on macOS 26.
    assert.equal(normalized("\uac00\u11a8"), "\uac00\u11a8"); // a syllable keeps its final consonant apart
    assert.equal(normalized("\u1100\u1161\u11a8"), "\uac01"); // jamo compose
    assert.equal(normalized("\u3131\u314f"), "\u1100\u1161"); // compatibility jamo don't
    assert.equal(normalized("\uff8a\uff9f"), "\u30cf\u309a"); // nor a halfwidth voicing mark
    assert.equal(normalized("\uff76\u3099"), "\u30ac");
    assert.equal(normalized("\uff45\u0301"), "\u00e9");
  });

  test("is exported under DigUp's name too", () => {
    assert.equal(SearchText.normalized("ﬁ"), "fi");
    assert.equal(SearchText.hasWords("two words"), true);
  });
});

describe("inflects", () => {
  test("is true for Indic and Arabic words only", () => {
    assert.equal(inflects("কুমির"), true);
    assert.equal(inflects("مدرسة"), true);
    assert.equal(inflects("payment"), false);
    assert.equal(inflects("日本語"), false);
  });
});

describe("hasWords", () => {
  test("keeps prose and drops number dumps", () => {
    let dump = "";
    for (let row = 0; row < 4000; row++) dump += `${row} ${(row * 7919) % 100003} ${(row * 31) % 977}\n`;
    dump += "4815162342\n";
    assert.equal(hasWords(dump), false);
    assert.equal(hasWords("Revenue 1,234,567 · Net income 234,567 · Margin 19% in the third quarter"), true);
    assert.equal(hasWords("কলকাতায় বৃষ্টি হচ্ছে"), true); // vowel signs are marks and count as letters
    assert.equal(hasWords(""), false);
    assert.equal(hasWords("   \n\t"), false);
  });

  test("needs a fifth of the non-space characters to be letters", () => {
    assert.equal(hasWords("a1111"), true); // 1 letter, 4 others: 4 >= 4
    assert.equal(hasWords("a11111"), false); // 1 letter, 5 others
  });
});

describe("matches", () => {
  test("are found as keyword search finds them but shown as written", () => {
    const arabic = "زرنا مدينة البتراء الأثرية في جنوب الأردن.";
    assert.deepEqual(found("الاردن", arabic), ["الأردن"]); // the hamza is kept: it's how it's written
    const voweled = "إِنَّ الْمَكْتَبَةَ تُغْلَقُ";
    assert.deepEqual(found("المكتبة", voweled), ["الْمَكْتَبَةَ"]);
    const bengali = "একটি বড় কুমিরের ছবি";
    assert.deepEqual(found("কুমির", bengali), ["কুমিরের"]); // never "কুমি"
    const english = "Sunday trip: day two";
    assert.deepEqual(found("day", english), ["day"]); // not in "Sunday"
    const turkish = "İ".repeat(60) + " son kelime";
    assert.deepEqual(found("kelime", turkish), ["kelime"]);
  });

  test("ignore case and accents, and the characters stay whole", () => {
    assert.deepEqual(found("cafe", "A Café, a CAFE."), ["Café", "CAFE"]);
    assert.deepEqual(found("CAFÉ", "cafe"), ["cafe"]);
    assert.deepEqual(found("cafe", "café au lait"), ["café"]); // decomposed é: the mark goes with it
    assert.deepEqual(found("ab", "ab-cd"), ["ab"]);
    assert.deepEqual(found("ab", "abc"), []);
    assert.deepEqual(found("", "abc"), []);
  });

  test("keep Indic vowel signs as part of the word", () => {
    assert.deepEqual(found("কম", "কুম কম"), ["কম"]); // কু is not ক
  });

  test("ignore accents and points but not viramas, as Foundation does", () => {
    assert.deepEqual(found("कलम", "नया क\u093cलम लो"), ["क\u093cलम"]); // a nukta is ignored
    assert.deepEqual(found("বনধু", "আমার বন্ধু এল"), []); // a virama is not
    assert.deepEqual(found("বন্ধু", "আমার বন্ধু এল"), ["বন্ধু"]);
    assert.deepEqual(found("naive", "a naïve plan"), ["naïve"]);
    assert.deepEqual(found("Αθηνα", "στην Αθήνα"), ["Αθήνα"]);
    assert.deepEqual(found("שלום", "אמר שָׁלוֹם לכולם"), ["שָׁלוֹם"]);
    assert.deepEqual(found("straße", "die STRASSE hier"), ["STRASSE"]);
  });

  test("compare whole letters, as Foundation does, except Latin, Greek and Cyrillic ones", () => {
    // Checked against DigUp's Swift on macOS 26.
    assert.deepEqual(found("\ud55c\uad6c", "x \ud55c\uad6d y"), []); // 한구 isn't in 한국
    assert.deepEqual(found("\uac00", "x \uac01 y"), []); // 가, 각
    assert.deepEqual(found("\u3066", "x \u3067 y"), []); // て, で
    assert.deepEqual(found("\u306f\u304b", "x \u306f\u304c y"), []); // はか, はが
    assert.deepEqual(found("\uac00", "x \uac00\u11a8 y"), ["\uac00\u11a8"]); // a final consonant apart
    assert.deepEqual(found("\uac01", "x \uac00\u11a8 y"), ["\uac00\u11a8"]);
    assert.deepEqual(found("\u0929", "x \u0928 y"), ["\u0928"]); // ऩ is न, in a short range
  });

  test("skip the marks Foundation skips, some only in a range of 65 code points or more", () => {
    const long = (text: string) => text + " " + "z".repeat(70);
    assert.deepEqual(found("\u0e01\u0e19", "x \u0e01\u0e31\u0e19 y"), ["\u0e01\u0e31\u0e19"]); // Thai
    assert.deepEqual(found("\u0e81\u0e99", "x \u0e81\u0eb1\u0e99 y"), ["\u0e81\u0eb1\u0e99"]); // Lao
    const bondhu = "\u09ac\u09a8\u09cd\u09a7\u09c1"; // বন্ধু
    assert.deepEqual(found("\u09ac\u09a8\u09a7", "x " + bondhu + " y"), []);
    assert.deepEqual(found("\u09ac\u09a8\u09a7", long("x " + bondhu + " y")), [bondhu]);
    // ा is a spacing sign: never skipped.
    assert.deepEqual(found("\u0915\u092e\u0930", long("x \u0915\u0941\u092e\u093e\u0930 y")), []);
    assert.deepEqual(found("\u0928", long("x \u0929 y")), []); // ऩ comes apart in a short range only
    // A short range doesn't end a match before a nukta and a virama.
    assert.deepEqual(found("\u0915", "x \u0915\u093c\u094d y"), []);
    assert.deepEqual(found("\u0915", long("x \u0915\u093c\u094d y")), ["\u0915\u093c\u094d"]);
    assert.deepEqual(found("\u0915", "x \u0915\u093c\u0941 y"), ["\u0915\u093c\u0941"]);
  });

  test("a voicing mark that Foundation's NFKC leaves apart may be skipped or matched", () => {
    const glass = "\uff76\uff9e\uff97\uff7d"; // ｶﾞﾗｽ
    assert.deepEqual(found("\u30ab\u30e9\u30b9", "x " + glass + " y"), [glass]); // カラス
    assert.deepEqual(found("\u30ac\u30e9\u30b9", "x " + glass + " y"), [glass]); // ガラス
    assert.deepEqual(found("\uff8a\uff9f\uff9d", "x \u30d1\u30f3 y"), ["\u30d1\u30f3"]); // ﾊﾟﾝ finds パン
  });

  test("do not overlap and stop at 500", () => {
    assert.equal(matches("a", "a ".repeat(800)).length, 500);
    assert.deepEqual(found("মা", "মায়ের মা"), ["মায়ের", "মা"]);
  });
});

describe("snippet", () => {
  test("quotes the text as written", () => {
    const text =
      "قَالَ مُحَمَّدٌ إِنَّ الْمَكْتَبَةَ الْعَامَّةَ تُغْلَقُ فِي السَّاعَةِ الثَّامِنَةِ مَسَاءً يَوْمَ الْخَمِيسِ";
    assert.ok(snippet(text, ["المكتبة"])?.includes("«الْمَكْتَبَةَ»"));
    assert.equal(snippet(text, ["كلمة"]), null);
  });

  test("starts a few words before the first match and shows about twelve words", () => {
    const text = Array.from({ length: 40 }, (_, i) => `w${i}`)
      .join(" ")
      .replace("w20", "needle");
    assert.equal(snippet(text, ["needle"]), "…w17 w18 w19 «needle» w21 w22 w23 w24 w25 w26 w27 …");
  });

  test("marks every term inside the window and collapses space", () => {
    assert.equal(snippet("The  quick\n brown fox", ["quick", "fox", "none"]), "The «quick» brown «fox»");
    assert.equal(snippet("Pay now", ["pay", "now"]), "«Pay» «now»");
  });
});

describe("PageTextProblem", () => {
  test("notices garbled page text", () => {
    // As PDFKit reads Bengali and Arabic pages made by Quartz/WebKit (testbed/make_lang.swift).
    const glyphOrder =
      "বািড় ভাড়ার চিপ ধানমি ৭ নর রােডর িতন বডরেমর াট মািসক ২৫,০০০ টাকা ভাড়ায় দওয়া হেলা। ভাড়ায়া দুই মােসর";
    const bengali =
      "বাড়ি ভাড়ার চুক্তিপত্র। ধানমন্ডি ৭ নম্বর রোডের তিন বেডরুমের ফ্ল্যাটটি মাসিক ২৫,০০০ টাকা ভাড়ায় দেওয়া হলো।";
    const lost = "ارتفعت ا.بيعات بنسبة خمسة عشر با.ئة في الربع الثالث. زرنا مدينة البتراء ا?ثرية في جنوب ا?ردن.";
    const arabic = "ارتفعت المبيعات بنسبة خمسة عشر بالمئة في الربع الثالث. زرنا مدينة البتراء الأثرية في جنوب الأردن.";
    assert.equal(PageTextProblem.check(glyphOrder), "glyphOrder");
    assert.equal(PageTextProblem.check(bengali), null);
    assert.equal(PageTextProblem.check(lost), "lostLetters");
    assert.equal(PageTextProblem.check(arabic), null);
    assert.equal(PageTextProblem.check("Revenue grew 20%. See p.4?No. Done."), null);
  });

  test("does not take real Arabic abbreviations for lost letters", () => {
    assert.equal(PageTextProblem.check("أ.د.محمد علي، أستاذ في الجامعة. د.خالد و د.سارة من شركة ذ.م.م للتجارة"), null);
    const bullets = " Item one of the slide\n".repeat(6);
    assert.equal(PageTextProblem.check(bullets), null);
  });
});

describe("Landmark", () => {
  test("finds the page in Preview", () => {
    const pages = [
      "Quarterly business review\nRevenue grew in Japan and Europe.",
      "Hiking trip to Mount Fuji\nWe took the Yoshida trail from the fifth station in Japan.",
    ];
    // A word that's on that page, preferring one that isn't on an earlier page…
    assert.equal(Landmark.find(2, pages, ["japan", "Yoshida"]), "Yoshida");
    // …else any that is.
    assert.equal(Landmark.find(2, pages, ["japan", "bread"]), "Japan");
    assert.equal(Landmark.find(2, pages, ["bread"]), null);
    assert.equal(Landmark.find(1, pages, ["japan"]), null); // opens there anyway
    // Spelled as the page spells it; a word a garbled text layer lost isn't offered.
    const arabic = ["التقرير الربعي", "رحلة إلى البتراء\nزرنا مدينة البتراء الأثرية في جنوب الأردن"];
    assert.equal(Landmark.find(2, arabic, ["الاردن"]), "الأردن");
    const garbled = ["التقرير الربعي", "زرنا مدينة البتراء ا?ثرية في جنوب ا?ردن"];
    assert.equal(Landmark.find(2, garbled, ["الاردن"]), null);
  });

  test("skips words shorter than three characters", () => {
    assert.equal(Landmark.find(2, ["a", "an ox"], ["an", "ox"]), null);
  });
});

describe("graphemes", () => {
  test("count characters the way Swift does", () => {
    assert.equal(graphemeCount("abc"), 3);
    assert.equal(graphemeCount("a\r\nb"), 3); // CR LF is one Character
    assert.equal(graphemeCount("éx"), 2);
    assert.equal(graphemeCount("👨‍👩‍👧‍👦!"), 2);
    assert.equal(graphemeCount("🇨🇿🇨🇿"), 2);
    assert.equal(graphemeCount("মা"), 1);
    assert.equal(graphemeCount(""), 0);
  });

  test("cut a prefix without splitting a character", () => {
    assert.equal(graphemePrefix("abcdef", 3), "abc");
    assert.equal(graphemePrefix("abc", 10), "abc");
    assert.equal(graphemePrefix("ééé", 2), "éé");
    assert.equal(graphemePrefix("ab́c", 2), "ab́");
    assert.equal(graphemePrefix("a\r\nb", 2), "a\r\n");
    assert.equal(graphemePrefix("ab👨‍👩‍👧‍👦cd", 3), "ab👨‍👩‍👧‍👦");
  });

  test("map UTF-16 offsets back to characters", () => {
    const g = new Graphemes("ae\u0301b");
    assert.deepEqual(
      [0, 1, 2, 3, 4].map((offset) => g.indexAt(offset)),
      [0, 1, 1, 2, 3],
    );
    assert.deepEqual(
      [0, 1, 2, 3, 4].map((offset) => g.isBoundary(offset)),
      [true, true, false, true, true],
    );
    assert.equal(new Graphemes("abc").indexAt(2), 2);
  });

  test("split stacked consonants as Swift does", () => {
    // ICU keeps a consonant stacked under a coeng or virama in the Character above it; Swift starts a new one. Every
    // mark was checked against Swift 6.3; a Devanagari conjunct is one Character in both.
    const characters = (text: string) => {
      const g = new Graphemes(text);
      return Array.from({ length: g.count }, (_, i) => g.at(i));
    };
    assert.deepEqual(characters("\u1781\u17d2\u1798\u17c2\u179a"), ["\u1781\u17d2", "\u1798\u17c2", "\u179a"]);
    assert.deepEqual(characters("\u179f\u17d2\u178f\u17d2\u179a\u17b8"), [
      "\u179f\u17d2",
      "\u178f\u17d2",
      "\u179a\u17b8",
    ]);
    assert.deepEqual(characters("\u1000\u1039\u1000\u102c"), ["\u1000\u1039", "\u1000", "\u102c"]); // Myanmar
    assert.deepEqual(characters("\ua98f\ua9c0\ua98f"), ["\ua98f\ua9c0", "\ua98f"]); // Javanese
    assert.deepEqual(characters("\u1780\u17d2\u200d\u1780"), ["\u1780\u17d2\u200d", "\u1780"]);
    assert.deepEqual(characters("\u1780\u17d2\u0e33"), ["\u1780\u17d2\u0e33"]); // "am" joins anything
    assert.deepEqual(characters("\u0915\u094d\u0937"), ["\u0915\u094d\u0937"]);
    assert.equal(graphemeCount("\u1781\u17d2\u1798\u17c2\u179a"), 3);
    assert.equal(graphemePrefix("x\u1781\u17d2\u1798\u17c2\u179a", 2), "x\u1781\u17d2");
  });

  test("split only around joining characters, as a pass over the whole text would", () => {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const stacked =
      /[\u1039\u17d2\u1a60\u1b44\u1bab\ua9c0\uaaf6][\p{M}\u200c\u200d]*(?=(?![\u0e33\u0eb3\uff9e\uff9f])\p{L})/gu;
    const whole = (text: string) =>
      [...segmenter.segment(text)].flatMap(({ segment }) => {
        const cuts = [0, ...[...segment.matchAll(stacked)].map((m) => m.index + m[0].length), segment.length];
        return cuts.slice(1).map((cut, i) => segment.slice(cuts[i], cut));
      });
    const pieces = [
      "a",
      " ",
      "\n",
      "\r\n",
      "\r",
      "\u0301",
      "\u200d",
      "\u{1F44D}",
      "\u{1F3FD}",
      "\u{1F1E8}\u{1F1FF}",
      "\u{1F1FA}",
      "\u1100",
      "\u1161",
      "\u11a8",
      "\uac00",
      "\u0600",
      "\u0915",
      "\u094d",
      "\u0937",
      "\u1780",
      "\u17d2",
      "\u0e33",
      "\ud83d",
      "\uffff",
      "\u2764",
      "\ufe0f",
    ];
    let seed = 3;
    const next = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff);
    for (let round = 0; round < 2000; round++) {
      // Mostly plain text with a few joining characters in it, and some text that is all of them.
      const dense = round % 4 === 0;
      const text = Array.from({ length: 1 + (next() % 120) }, () =>
        dense || next() % 10 === 0 ? pieces[next() % pieces.length] : "plain ".charAt(next() % 6),
      ).join("");
      const g = new Graphemes(text);
      assert.deepEqual(
        Array.from({ length: g.count }, (_, i) => g.at(i)),
        whole(text),
        JSON.stringify(text),
      );
      assert.equal(graphemeCount(text), g.count);
      const count = next() % 10;
      assert.equal(graphemePrefix(text, count), whole(text).slice(0, count).join(""));
    }
  });

  test("a long text with one emoji costs a scan, not a split of every character", () => {
    const text = "plain words and more words ".repeat(400_000) + "\u{1F44D}";
    const start = performance.now();
    assert.equal(graphemeCount(text), text.length - 1);
    assert.equal(graphemePrefix(text, 5), "plain");
    assert.equal(new Graphemes(text).count, text.length - 1);
    assert.ok(performance.now() - start < 2000, `took ${performance.now() - start} ms`);
  });

  test("hasPrefix compares Characters, as Swift does", () => {
    assert.equal(hasPrefix("# comment", "#"), true);
    assert.equal(hasPrefix("#\u0301 not a comment", "#"), false);
    assert.equal(hasPrefix("ab", "ab"), true);
    assert.equal(hasPrefix("x\r\ny", "x\r"), false); // "\r\n" is one Character
    assert.equal(hasPrefix("Screenshot 1.png", "Screen Shot"), false);
  });

  test("index characters with their UTF-16 offsets", () => {
    const text = "a\r\né👍b";
    const g = new Graphemes(text);
    assert.equal(g.count, 5);
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5].map((i) => g.start(i)),
      [0, 1, 3, 5, 7, 8],
    );
    assert.equal(g.at(1), "\r\n");
    assert.equal(g.isWhitespace(1), true);
    assert.equal(g.isWhitespace(2), false);
    assert.equal(new Graphemes("é").count, 1);
  });
});

describe("whitespace classes", () => {
  test("trim as Foundation does", () => {
    assert.equal(trimWhitespaceAndNewlines("​ \n\t x \u0085 "), "x"); // ZWSP and NEL count
    assert.equal(trimWhitespaceAndNewlines("﻿x"), "﻿x"); // the BOM does not
    assert.equal(trimWhitespace(" \nx\n "), "\nx\n"); // newlines stay
    assert.equal(trimWhitespace(" x　"), "x");
  });

  test("lowercased works per scalar", () => {
    assert.equal(lowercased("ΟΔΟΣ"), "οδοσ"); // no final sigma
    assert.equal(lowercased("İ"), "i̇");
    assert.equal(lowercased("ABC"), "abc");
  });
});
