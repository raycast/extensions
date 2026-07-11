import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/applescript", () => ({ runAppleScript: vi.fn() }));
import { runAppleScript } from "../../src/lib/applescript";
import { musicProvider, parseMusicRecord } from "../../src/providers/music";

beforeEach(() => vi.mocked(runAppleScript).mockReset());

describe("parseMusicRecord", () => {
  it("parses a record", () => {
    expect(parseMusicRecord("Song|Artist|Album|225.5|83.2|playing")).toMatchObject({
      title: "Song",
      artist: "Artist",
      album: "Album",
      duration: 225.5,
      position: 83.2,
      isPlaying: true,
    });
  });
  it("survives pipes inside title", () => {
    const r = parseMusicRecord("A|B Song|Artist|Album|10|1|paused")!;
    expect(r.title).toBe("A|B Song");
    expect(r.isPlaying).toBe(false);
  });
  it("returns null for stopped", () => {
    expect(parseMusicRecord("stopped")).toBeNull();
  });
});

describe("musicProvider", () => {
  it("not available when process absent", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("false");
    expect(await musicProvider.isAvailable()).toBe(false);
  });
  it("getSource maps record", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Song|Artist|Album|100|5|playing");
    const s = await musicProvider.getSource();
    expect(s).toMatchObject({ id: "com.apple.Music", appName: "Music", title: "Song", origin: "applescript" });
  });
  it("getSource null on script failure", async () => {
    vi.mocked(runAppleScript).mockResolvedValue(null);
    expect(await musicProvider.getSource()).toBeNull();
  });
  it("control sends playpause", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await musicProvider.control!("playpause");
    expect(runAppleScript).toHaveBeenCalledWith('tell application "Music" to playpause');
  });
});
