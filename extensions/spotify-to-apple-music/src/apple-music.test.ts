import { describe, expect, it, vi } from "vitest";
import {
  buildAppleMusicSearchUrl,
  findAppleMusicUrl,
  shouldOpenInMusicApp,
} from "./apple-music.js";

describe("findAppleMusicUrl", () => {
  it("returns the Apple Music song URL when it finds a matching result", async () => {
    const track = {
      uri: "spotify:track:123",
      name: "Call Me Maybe",
      artist: "Carly Rae Jepsen",
    };

    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            trackName: "Call Me Maybe (Remastered)",
            artistName: "Carly Rae Jepsen",
            trackViewUrl: "https://music.apple.com/us/song/call-me-maybe/1",
          },
        ],
      }),
    });

    const url = await findAppleMusicUrl(track, "US", fetchFn as typeof fetch);
    expect(url).toBe("https://music.apple.com/us/song/call-me-maybe/1");
  });

  it("falls back to the Apple Music search page when the lookup fails", async () => {
    const track = {
      uri: "spotify:track:456",
      name: "Track",
      artist: "Artist",
    };

    const url = await findAppleMusicUrl(
      track,
      "US",
      vi.fn().mockRejectedValue(new Error("boom")) as typeof fetch,
    );

    expect(url).toBe(buildAppleMusicSearchUrl(track, "US"));
  });

  it("uses the first Apple Music result when exact matching misses a valid song", async () => {
    const track = {
      uri: "spotify:track:789",
      name: "Sky and Sand",
      artist: "Paul Kalkbrenner",
    };

    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            trackName: "Sky and Sand",
            artistName: "Paul Kalkbrenner & Fritz Kalkbrenner",
            trackViewUrl: "https://music.apple.com/us/song/sky-and-sand/2",
          },
          {
            trackName: "Sky and Sand (Instrumental)",
            artistName: "Paul Kalkbrenner",
            trackViewUrl:
              "https://music.apple.com/us/song/sky-and-sand-instrumental/3",
          },
        ],
      }),
    });

    const url = await findAppleMusicUrl(track, "US", fetchFn as typeof fetch);
    expect(url).toBe("https://music.apple.com/us/song/sky-and-sand/2");
  });
});

describe("shouldOpenInMusicApp", () => {
  it("opens direct Apple Music content URLs in the Music app", () => {
    expect(
      shouldOpenInMusicApp("https://music.apple.com/us/song/call-me-maybe/1"),
    ).toBe(true);
  });

  it("keeps Apple Music search URLs in the browser", () => {
    expect(
      shouldOpenInMusicApp(
        "https://music.apple.com/us/search?term=Carly+Rae+Jepsen+Call+Me+Maybe",
      ),
    ).toBe(false);
  });
});
