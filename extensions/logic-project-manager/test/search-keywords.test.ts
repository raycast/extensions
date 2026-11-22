import { describe, expect, it } from "vitest";
import { bpmMatches, matchesSearch, nameKeywords, timeSignatureMatches } from "@/core/ui/shared/search-keywords";

describe("nameKeywords", () => {
  it("& 换成 n / and", () => {
    expect(nameKeywords("R&B")).toEqual(expect.arrayContaining(["rnb", "randb"]));
    expect(nameKeywords("Drum & Bass")).toEqual(expect.arrayContaining(["drumnbass", "drumandbass"]));
  });

  it("去掉空格和标点", () => {
    expect(nameKeywords("Hip-Hop")).toContain("hiphop");
    expect(nameKeywords("UK Garage")).toContain("ukgarage");
  });
});

describe("matchesSearch", () => {
  it("每个词都命中才算", () => {
    const terms = [...nameKeywords("R&B"), "2025"];
    expect(matchesSearch(terms, "rnb 2025")).toBe(true);
    expect(matchesSearch(terms, "R&B 2025")).toBe(true);
    expect(matchesSearch(terms, "rnb 2024")).toBe(false);
  });

  it("忽略大小写、标点、重音和全角", () => {
    expect(matchesSearch(nameKeywords("Hip-Hop"), "hiphop")).toBe(true);
    expect(matchesSearch(nameKeywords("Hip-Hop"), "ｈｉｐｈｏｐ")).toBe(true);
    expect(matchesSearch(nameKeywords("Café"), "cafe")).toBe(true);
    expect(matchesSearch(nameKeywords("Drum & Bass"), "drum and bass")).toBe(true);
  });

  it("没输入时全部显示", () => {
    expect(matchesSearch(["anything"], "")).toBe(true);
  });
});

describe("matchesSearch 的 matchWord", () => {
  it("matchWord 判断过的词以它为准", () => {
    const matchWord = (word: string) => (word === "cm" ? false : undefined);
    expect(matchesSearch(["cmaj"], "cm", matchWord)).toBe(false);
    expect(matchesSearch(["cmaj"], "cma", matchWord)).toBe(true);
  });
});

describe("bpmMatches", () => {
  it("单个数字：四舍五入后相等，含半速、倍速", () => {
    expect(bpmMatches(140, "140")).toBe(true);
    expect(bpmMatches(139.6, "140")).toBe(true);
    expect(bpmMatches(70, "140")).toBe(true);
    expect(bpmMatches(280, "140")).toBe(true);
    expect(bpmMatches(120, "140")).toBe(false);
    expect(bpmMatches(120, "120bpm")).toBe(true);
  });

  it("范围：两端都算，顺序不限，含半速、倍速", () => {
    expect(bpmMatches(95, "90-100")).toBe(true);
    expect(bpmMatches(100, "90-100")).toBe(true);
    expect(bpmMatches(95, "100-90")).toBe(true);
    expect(bpmMatches(190, "90-100")).toBe(true);
    expect(bpmMatches(120, "90-100")).toBe(false);
  });

  it("没有 BPM 的项目不算命中", () => {
    expect(bpmMatches(null, "120")).toBe(false);
  });

  it("不是 BPM 写法的交给文字比较", () => {
    expect(bpmMatches(120, "2025")).toBeUndefined();
    expect(bpmMatches(120, "rnb")).toBeUndefined();
  });

  it("matchesSearch 里数字按 BPM 判断，不再按文字", () => {
    const matchWord = (word: string) => bpmMatches(92, word);
    expect(matchesSearch(["Song 120"], "120", matchWord)).toBe(false);
    expect(matchesSearch(["Song"], "92", matchWord)).toBe(true);
  });
});

describe("timeSignatureMatches", () => {
  it("整个对上才算", () => {
    expect(timeSignatureMatches("3/4", "3/4")).toBe(true);
    expect(timeSignatureMatches("6/8", "06/08")).toBe(true);
    expect(timeSignatureMatches("6/4", "6/8")).toBe(false);
    expect(timeSignatureMatches("4/4", "3/4")).toBe(false);
  });

  it("没有拍号的项目不算命中", () => {
    expect(timeSignatureMatches(null, "4/4")).toBe(false);
  });

  it("不是拍号写法的交给文字比较", () => {
    expect(timeSignatureMatches("4/4", "2025")).toBeUndefined();
    expect(timeSignatureMatches("4/4", "120")).toBeUndefined();
    expect(timeSignatureMatches("4/4", "rnb")).toBeUndefined();
  });

  it("matchesSearch 里拍号按拍号判断，不再按文字", () => {
    const matchWord = (word: string) => timeSignatureMatches("4/4", word);
    expect(matchesSearch(["Song 34"], "3/4", matchWord)).toBe(false);
    expect(matchesSearch(["Song"], "4/4", matchWord)).toBe(true);
  });
});
