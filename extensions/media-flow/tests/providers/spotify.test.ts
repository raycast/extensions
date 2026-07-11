import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/applescript", () => ({ runAppleScript: vi.fn() }));
import { runAppleScript } from "../../src/lib/applescript";
import { parseSpotifyRecord, spotifyProvider } from "../../src/providers/spotify";

beforeEach(() => vi.mocked(runAppleScript).mockReset());

const REC = "Song|Artist|Album|225500|83|playing|https://i.scdn.co/image/abc|spotify:track:xyz";

describe("parseSpotifyRecord", () => {
  it("parses and converts ms to seconds", () => {
    expect(parseSpotifyRecord(REC)).toMatchObject({
      title: "Song",
      duration: 225.5,
      position: 83,
      isPlaying: true,
      artworkUrl: "https://i.scdn.co/image/abc",
      url: "https://open.spotify.com/track/xyz",
    });
  });
  it("null for stopped", () => expect(parseSpotifyRecord("stopped")).toBeNull());
  it("survives pipes inside title", () => {
    const r = parseSpotifyRecord(
      "A|B Song|Artist|Album|10000|1|paused|https://i.scdn.co/image/abc|spotify:track:xyz",
    )!;
    expect(r.title).toBe("A|B Song");
    expect(r.isPlaying).toBe(false);
  });
  it("passes through non-matching spotify url unchanged", () => {
    const r = parseSpotifyRecord(
      "Song|Artist|Album|225500|83|playing|https://i.scdn.co/image/abc|not-a-spotify-uri",
    )!;
    expect(r.url).toBe("not-a-spotify-uri");
  });
});

describe("spotifyProvider.getSource", () => {
  it("maps to MediaSource", async () => {
    vi.mocked(runAppleScript).mockResolvedValue(REC);
    const s = await spotifyProvider.getSource();
    expect(s).toMatchObject({
      id: "com.spotify.client",
      appName: "Spotify",
      origin: "applescript",
      url: "https://open.spotify.com/track/xyz",
    });
    expect(s).not.toHaveProperty("artworkUrl");
  });
  it("getSource null on script failure", async () => {
    vi.mocked(runAppleScript).mockResolvedValue(null);
    expect(await spotifyProvider.getSource()).toBeNull();
  });
  it("getSource null when stopped", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("stopped");
    expect(await spotifyProvider.getSource()).toBeNull();
  });
});

describe("spotifyProvider.isAvailable", () => {
  it("not available when process absent", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("false");
    expect(await spotifyProvider.isAvailable()).toBe(false);
  });
});

describe("spotifyProvider.control", () => {
  it("sends next track", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await spotifyProvider.control!("next");
    expect(runAppleScript).toHaveBeenCalledWith('tell application "Spotify" to next track');
  });
});
