import { describe, it, expect } from "vitest";
import { cleanUpSrt } from "../src/transcript";

/** Build a valid multi-cue SRT document from cue texts (1s apart). */
function srt(...texts: string[]): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    texts
      .map((text, i) => {
        const s = i + 1;
        return `${s}\n00:00:${pad(s)},000 --> 00:00:${pad(s + 1)},000\n${text}`;
      })
      .join("\n\n") + "\n"
  );
}

describe("cleanUpSrt", () => {
  it("collapses rolling prefix captions without duplicating words", () => {
    const input = srt("the quick", "the quick brown fox");
    expect(cleanUpSrt(input)).toBe("the quick brown fox");
  });

  it("does NOT corrupt a non-prefix overlap (the includes() bug)", () => {
    // cue2 contains cue1 but not as a prefix. The old `includes()` logic sliced
    // the wrong leading chars and produced "the quick brown brown fox". The
    // startsWith gate appends the whole second cue instead — no sliced fragment.
    const input = srt("the quick brown", "well the quick brown fox");
    const out = cleanUpSrt(input);
    expect(out).toBe("the quick brown well the quick brown fox");
    expect(out).not.toContain("brown brown");
  });

  it("collapses exact-duplicate consecutive cues to a single copy", () => {
    const input = srt("hello world", "hello world");
    expect(cleanUpSrt(input)).toBe("hello world");
  });

  it("strips HTML tags, bracketed/paren annotations, braces, and music symbols", () => {
    const input = srt("<i>Hello</i> [Music] {an8} (laughs) ♪world♪");
    const out = cleanUpSrt(input);
    for (const marker of ["<", ">", "[", "]", "{", "}", "(", ")", "♪", "Music", "laughs"]) {
      expect(out).not.toContain(marker);
    }
    expect(out).toContain("Hello");
    expect(out).toContain("world");
  });

  it("returns an empty string for a music-only / sound-effect-only track", () => {
    const input = srt("[Music]", "♪ ♪", "(applause)");
    expect(cleanUpSrt(input)).toBe("");
  });

  it("returns an empty string for empty input", () => {
    expect(cleanUpSrt("")).toBe("");
  });
});
