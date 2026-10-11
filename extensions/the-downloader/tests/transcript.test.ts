import { describe, it, expect } from "vitest";
import {
  buildTranscriptArgs,
  captionDownloadError,
  cleanUpSrt,
  noCaptionsMessage,
  noCaptionsReason,
} from "../src/transcript";

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

describe("noCaptionsMessage", () => {
  it("says a video simply has no captions when none are listed", () => {
    expect(noCaptionsMessage({ requested: "auto", languages: ["en"], listed: false })).toBe(
      "This video has no captions.",
    );
  });

  it("names a missing chosen language without pointing to a chat setting", () => {
    // The Download form and the AI tools also land here, and the chat's
    // Transcript Language preference doesn't apply to them.
    const message = noCaptionsMessage({ requested: "de", languages: ["de", "en"], listed: true });
    expect(message).toBe("This video has no German captions.");
    expect(message).not.toMatch(/preferences|Transcript Language/);
  });

  it("explains YouTube's caption rate limit", () => {
    expect(
      noCaptionsMessage({
        requested: "auto",
        languages: ["en"],
        listed: true,
        error: "Unable to download video subtitles for 'en': HTTP Error 429: Too Many Requests",
      }),
    ).toMatch(/limiting caption downloads.*few minutes/);
  });

  it("keeps any other yt-dlp error", () => {
    expect(noCaptionsMessage({ requested: "auto", languages: ["en"], listed: true, error: "Something odd" })).toBe(
      "Couldn't get the captions: Something odd",
    );
  });
});

describe("noCaptionsReason", () => {
  it("tells a missing language apart from no captions and a failed download", () => {
    expect(noCaptionsReason({ requested: "de", listed: true })).toBe("language");
    expect(noCaptionsReason({ requested: "auto", listed: true })).toBe("none");
    expect(noCaptionsReason({ requested: "de", listed: false })).toBe("none");
    expect(noCaptionsReason({ requested: "de", listed: true, error: "HTTP Error 429" })).toBe("failed");
  });
});

describe("captionDownloadError", () => {
  it("finds the failed caption download that --ignore-errors turns into a warning", () => {
    const stderr =
      "WARNING: [youtube] abc: Unable to download video subtitles for 'en': HTTP Error 429: Too Many Requests\n";
    expect(captionDownloadError(stderr)).toBe(
      "Unable to download video subtitles for 'en': HTTP Error 429: Too Many Requests",
    );
    expect(
      noCaptionsMessage({ requested: "auto", languages: ["en"], listed: true, error: captionDownloadError(stderr) }),
    ).toMatch(/limiting caption downloads.*few minutes/);
  });

  it("is undefined when no caption download failed", () => {
    expect(captionDownloadError("ERROR: [youtube] abc: Video unavailable\n")).toBeUndefined();
    expect(captionDownloadError("")).toBeUndefined();
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

  it("asks for exactly the listed track when there is one", () => {
    const one = buildTranscriptArgs({
      url: "u",
      languages: ["en"],
      track: "en-orig",
      ffmpegPath: "/ff",
      outputTemplate: "o",
    });
    expect(one[one.indexOf("--sub-langs") + 1]).toBe("en-orig");
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
