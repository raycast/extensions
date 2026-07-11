import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/exec", () => ({ execSafe: vi.fn() }));
vi.mock("../../src/core/artworkCache", () => ({ cacheArtwork: vi.fn(async () => "/tmp/a.jpg") }));
import { execSafe } from "../../src/lib/exec";
import { MEDIA_CONTROL_BIN, mediaControlProvider, parseMediaControlOutput } from "../../src/providers/mediaControl";

beforeEach(() => vi.mocked(execSafe).mockReset());

const SAMPLE = JSON.stringify({
  title: "Song",
  artist: "Artist",
  album: "Album",
  duration: 225.5,
  elapsedTime: 83.2,
  playing: true,
  bundleIdentifier: "com.spotify.client",
  artworkData: Buffer.from("img").toString("base64"),
  artworkMimeType: "image/jpeg",
});

describe("parseMediaControlOutput", () => {
  it("parses a full payload", () => {
    const raw = parseMediaControlOutput(SAMPLE)!;
    expect(raw.title).toBe("Song");
    expect(raw.playing).toBe(true);
    expect(raw.bundleIdentifier).toBe("com.spotify.client");
  });
  it("returns null for invalid json", () => {
    expect(parseMediaControlOutput("not json")).toBeNull();
  });
  it("returns null when no title", () => {
    expect(parseMediaControlOutput(JSON.stringify({ playing: false }))).toBeNull();
  });
});

describe("mediaControlProvider.getSource", () => {
  it("maps payload to MediaSource with cached artwork", async () => {
    vi.mocked(execSafe).mockResolvedValue(SAMPLE);
    const s = await mediaControlProvider.getSource();
    expect(s).toMatchObject({
      id: "com.spotify.client",
      title: "Song",
      artist: "Artist",
      isPlaying: true,
      duration: 225.5,
      position: 83.2,
      origin: "media-remote",
      artworkPath: "/tmp/a.jpg",
    });
    expect(execSafe).toHaveBeenCalledWith(MEDIA_CONTROL_BIN, ["get"], expect.anything());
  });
  it("returns null when CLI missing", async () => {
    vi.mocked(execSafe).mockResolvedValue(null);
    expect(await mediaControlProvider.getSource()).toBeNull();
  });
});

describe("mediaControlProvider.control", () => {
  it("maps commands to subcommands", async () => {
    vi.mocked(execSafe).mockResolvedValue("");
    await mediaControlProvider.control!("playpause");
    expect(execSafe).toHaveBeenCalledWith(MEDIA_CONTROL_BIN, ["toggle-play-pause"], expect.anything());
    await mediaControlProvider.control!("next");
    expect(execSafe).toHaveBeenCalledWith(MEDIA_CONTROL_BIN, ["next-track"], expect.anything());
  });
});

describe("isAvailable", () => {
  it("true when binary answers", async () => {
    vi.mocked(execSafe).mockResolvedValue("media-control 0.7.6");
    expect(await mediaControlProvider.isAvailable()).toBe(true);
  });
  it("false when missing", async () => {
    vi.mocked(execSafe).mockResolvedValue(null);
    expect(await mediaControlProvider.isAvailable()).toBe(false);
  });
});
