// parseTokens on real fabric 1.4.518 captures.
import { describe, expect, test } from "bun:test";
import { parseTokens, tokensText } from "../lib/metadata";
import { fixture } from "./view-helpers";

describe("ISC-68.1: parseTokens takes the last token line, and nothing else", () => {
  test("Anthropic's two lines → the last one's counts", () => {
    expect(parseTokens(fixture("metadata-anthropic.txt"))).toEqual({ input: 10, output: 5, total: 15 });
  });

  test("one line, with fabric's output note after it", () => {
    const stderr = `${fixture("metadata.txt")}\n[Output also written to /Users/x/2026/10/19/a 1 2.md]\n`;
    expect(parseTokens(stderr)).toEqual({ input: 28, output: 3, total: 31 });
  });

  test("no token line → undefined, never zeros", () => {
    for (const stderr of [
      "",
      "\n\n",
      fixture("workflow-progress.txt"),
      fixture("workflow-progress-3step.txt"),
      "[Output also written to /tmp/2026/10/19.md]",
      "Input: 1 | Output: 2 | Total: 3", // no bracketed label
      "[Metadata] Input: 1 | Output: 2", // two counts
      "[Metadata] Input: 1 | Output: 2 | Total: 3 | Cost: 4", // four: an unknown shape reads as none, not as 2/3/4
      "[Metadata] v2 Input: 1 | Output: 2 | Total: 3", // a digit before the counts
      "[auth] password: 4417 pin 9921 otp 300118", // three numbers, not fabric's shape (review)
      "[x] api_key=a1b2c3",
      "[warn] retry 1 of 3 after 5s",
      "[Metadata] Input 1 | Output 2 | Total 3", // no colons
      "[db] user: 1 pass: 2 port: 3", // colons, but no ` | ` between
      fixture("spotify-not-configured.txt"),
    ])
      expect(parseTokens(stderr)).toBeUndefined();
  });

  test("a stray line after the real one doesn't displace it", () => {
    expect(parseTokens(`${fixture("metadata.txt")}[warn] retry 1 of 3 after 5s\n`)).toEqual({
      input: 28,
      output: 3,
      total: 31,
    });
  });

  test("Persian: words right to left, ASCII digits", () => {
    expect(parseTokens("[فراداده] ورودی: 28 | خروجی: 3 | مجموع: 31")).toEqual({ input: 28, output: 3, total: 31 });
  });

  test("the Tokens row text", () => {
    expect(tokensText({ input: 1234, output: 5, total: 1239 })).toBe("1,234 in · 5 out · 1,239 total");
  });
});

describe("ISC-69: localized lines parse (real captures)", () => {
  test.each([
    ["metadata-de.txt", "[Metadaten] Eingabe"],
    ["metadata-it.txt", "[Metadati] Input"],
    ["metadata-fr.txt", "Entrée :"],
    ["metadata-zh.txt", "输入：28"],
  ])("%s", (file, marker) => {
    const text = fixture(file);
    expect(text).toContain(marker);
    expect(parseTokens(text)).toEqual({ input: 28, output: 3, total: 31 });
  });
});
