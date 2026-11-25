import { describe, expect, it } from "vitest";
import { keyKeywords, keyToken } from "../src/core/projects/musical-key";

describe("keyKeywords", () => {
  it("大小调给出简写", () => {
    expect(keyKeywords("A Minor")).toEqual(["am", "amin", "a minor"]);
    expect(keyKeywords("C Major")).toEqual(["cmaj", "c major"]);
  });

  it("同音的两种写法都给", () => {
    expect(keyKeywords("C♯/D♭ Minor")).toEqual(expect.arrayContaining(["c#m", "dbm", "c# minor", "db minor"]));
    expect(keyKeywords("E♭ Major")).toEqual(expect.arrayContaining(["ebmaj", "d#maj"]));
  });

  it("不给单独的根音", () => {
    expect(keyKeywords("E♭ Major")).not.toContain("eb");
  });

  it("其他音阶用全名", () => {
    expect(keyKeywords("D Dorian")).toEqual(["d dorian"]);
  });
});

describe("keyToken", () => {
  it("♯ ♭ 和空格统一", () => {
    expect(keyToken("C♯ m")).toBe("c#m");
    expect(keyToken("D♭ Minor")).toBe("dbminor");
  });
});
