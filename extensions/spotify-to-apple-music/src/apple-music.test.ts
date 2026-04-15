import { describe, expect, it, vi } from "vitest";
import { buildAppleMusicSearchUrl, findAppleMusicUrl } from "./apple-music";

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
});
