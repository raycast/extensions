import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/core/mediaService", () => ({
  getMediaSources: vi.fn(async () => ({
    engineAvailable: true,
    sources: [{ id: "a", appName: "Music", title: "Song", artist: "Artist", isPlaying: true, origin: "applescript" }],
  })),
  controlSource: vi.fn(),
}));
vi.mock("../../src/core/setup", () => ({ registerAllProviders: vi.fn() }));
import { controlSource } from "../../src/core/mediaService";
import getNowPlaying from "../../src/tools/get-now-playing";
import controlPlayback, { confirmation } from "../../src/tools/control-playback";

describe("get-now-playing tool", () => {
  it("returns readable summary with track data", async () => {
    const out = await getNowPlaying();
    expect(out).toContain("Song");
    expect(out).toContain("Artist");
  });
});

describe("control-playback tool", () => {
  it("controls the playing source", async () => {
    await controlPlayback({ command: "next" });
    expect(controlSource).toHaveBeenCalledWith(expect.objectContaining({ title: "Song" }), "next");
  });
  it("has a confirmation for destructive-ish control", async () => {
    const c = await confirmation({ command: "pause" });
    expect(c && "message" in c ? c.message : "").toContain("pause");
  });
});
