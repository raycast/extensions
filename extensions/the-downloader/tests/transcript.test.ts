import { describe, it, expect } from "vitest";
import { buildTranscriptArgs, cleanUpSrt, pickSubtitleFile, subLangsArg, transcriptLanguages } from "../src/transcript";

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

describe("transcriptLanguages", () => {
  it("asks for the requested language, then the video's own when it differs", () => {
    expect(transcriptLanguages("en", "de")).toEqual(["en", "de"]);
    expect(transcriptLanguages("en", "en-US")).toEqual(["en"]);
    expect(transcriptLanguages("es", undefined)).toEqual(["es"]);
    expect(transcriptLanguages("en", null)).toEqual(["en"]);
  });
});

describe("subLangsArg", () => {
  it("adds each language's regional and automatic variants", () => {
    expect(subLangsArg(["en", "de"])).toBe("en,en.*,de,de.*");
  });
});

describe("pickSubtitleFile", () => {
  it("prefers the exact (uploaded) track over variants such as YouTube's auto en-orig", () => {
    expect(pickSubtitleFile(["id.en-orig.srt", "id.en.srt"], ["en"])).toBe("id.en.srt");
  });

  it("falls back to a regional or automatic variant, then to the next language", () => {
    expect(pickSubtitleFile(["id.en-US.srt"], ["en"])).toBe("id.en-US.srt");
    expect(pickSubtitleFile(["id.de.srt"], ["en", "de"])).toBe("id.de.srt");
  });

  it("ignores other files and unrelated languages", () => {
    expect(pickSubtitleFile(["id.fr.srt", "id.info.json", "id.enx.srt"], ["en"])).toBeUndefined();
  });
});

describe("buildTranscriptArgs", () => {
  const args = buildTranscriptArgs({
    url: "https://www.youtube.com/watch?v=abc",
    languages: ["en", "de"],
    ffmpegPath: "/ff",
    outputTemplate: "/tmp/x/%(id)s.%(ext)s",
  });

  it("fetches captions only, in every wanted language and variant", () => {
    expect(args).toEqual(
      expect.arrayContaining(["--skip-download", "--no-playlist", "--write-sub", "--write-auto-sub"]),
    );
    expect(args[args.indexOf("--sub-langs") + 1]).toBe("en,en.*,de,de.*");
    expect(args.at(-1)).toBe("https://www.youtube.com/watch?v=abc");
  });

  it("keeps going when one caption track fails (e.g. HTTP 429), so the others can still be saved", () => {
    // Without it yt-dlp raises on the first failed track and never tries the rest.
    expect(args).toContain("--ignore-errors");
  });

  it("passes the JavaScript runtime only when there is one", () => {
    expect(args).not.toContain("--js-runtimes");
    const withDeno = buildTranscriptArgs({
      url: "u",
      languages: ["en"],
      ffmpegPath: "/ff",
      outputTemplate: "o",
      denoPath: "/deno",
    });
    expect(withDeno[withDeno.indexOf("--js-runtimes") + 1]).toBe("deno:/deno");
  });
});

describe("cleanUpSrt hard spaces", () => {
  it("turns the \\h hard-space code YouTube's captions carry into a plain space", () => {
    const srt = "1\n00:00:00,000 --> 00:00:02,000\nHat es einen\\h Rand?\n";
    expect(cleanUpSrt(srt)).toBe("Hat es einen Rand?");
  });
});
