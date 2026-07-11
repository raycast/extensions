import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaSource, SourceProvider } from "../../src/core/types";

vi.mock("../../src/providers/mediaControl", () => ({
  mediaControlProvider: {
    id: "media-control",
    displayName: "System",
    bundleIds: [],
    capabilities: { control: true, artwork: true, seek: false },
    isAvailable: vi.fn(),
    getSource: vi.fn(),
    control: vi.fn(),
  },
}));
import { mediaControlProvider } from "../../src/providers/mediaControl";
import { clearProviders, registerProvider } from "../../src/core/registry";
import { controlSource, getMediaSources, stabilizeOrder } from "../../src/core/mediaService";

const mc = mediaControlProvider as unknown as {
  isAvailable: ReturnType<typeof vi.fn>;
  getSource: ReturnType<typeof vi.fn>;
  control: ReturnType<typeof vi.fn>;
};

function src(partial: Partial<MediaSource>): MediaSource {
  return { id: "x", appName: "X", title: "T", isPlaying: false, origin: "applescript", ...partial };
}

function provider(id: string, bundleIds: string[], source: MediaSource | null, control = vi.fn()): SourceProvider & { control: ReturnType<typeof vi.fn> } {
  return {
    id,
    displayName: id,
    bundleIds,
    capabilities: { control: true, artwork: false, seek: false },
    isAvailable: async () => true,
    getSource: async () => source,
    control,
  };
}

beforeEach(() => {
  clearProviders();
  mc.isAvailable.mockReset();
  mc.getSource.mockReset();
  mc.control.mockReset();
});

describe("getMediaSources", () => {
  it("merges provider source into primary by bundle id", async () => {
    mc.isAvailable.mockResolvedValue(true);
    mc.getSource.mockResolvedValue(
      src({ id: "com.spotify.client", bundleId: "com.spotify.client", title: "Old", isPlaying: true, artworkPath: "/tmp/a.jpg", origin: "media-remote" }),
    );
    registerProvider(provider("spotify", ["com.spotify.client"], src({ id: "com.spotify.client", bundleId: "com.spotify.client", title: "Fresh", position: 10 })));
    const { sources, engineAvailable } = await getMediaSources();
    expect(engineAvailable).toBe(true);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ title: "Fresh", position: 10, artworkPath: "/tmp/a.jpg", isPlaying: true });
  });

  it("keeps distinct sources separate, playing first", async () => {
    mc.isAvailable.mockResolvedValue(true);
    mc.getSource.mockResolvedValue(src({ id: "com.apple.Music", bundleId: "com.apple.Music", isPlaying: false, origin: "media-remote" }));
    registerProvider(provider("spotify", ["com.spotify.client"], src({ id: "com.spotify.client", bundleId: "com.spotify.client", isPlaying: true })));
    const { sources } = await getMediaSources();
    expect(sources.map((s) => s.id)).toEqual(["com.spotify.client", "com.apple.Music"]);
  });

  it("pinned source ranks above non-playing", async () => {
    mc.isAvailable.mockResolvedValue(false);
    mc.getSource.mockResolvedValue(null);
    registerProvider(provider("a", ["a.app"], src({ id: "a.app", bundleId: "a.app", appName: "AAA" })));
    registerProvider(provider("b", ["b.app"], src({ id: "b.app", bundleId: "b.app", appName: "BBB" })));
    const { sources } = await getMediaSources("b.app");
    expect(sources[0].id).toBe("b.app");
  });

  it("keeps primary field when provider merges an explicitly undefined value", async () => {
    mc.isAvailable.mockResolvedValue(true);
    mc.getSource.mockResolvedValue(
      src({ id: "com.spotify.client", bundleId: "com.spotify.client", artist: "Real Artist", origin: "media-remote" }),
    );
    registerProvider(
      provider(
        "spotify",
        ["com.spotify.client"],
        src({ id: "com.spotify.client", bundleId: "com.spotify.client", title: "Fresh", artist: undefined }),
      ),
    );
    const { sources } = await getMediaSources();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ title: "Fresh", artist: "Real Artist" });
  });

  it("survives a provider whose getSource rejects", async () => {
    mc.isAvailable.mockResolvedValue(false);
    mc.getSource.mockResolvedValue(null);
    const broken = provider("broken", ["broken.app"], null);
    broken.getSource = async () => {
      throw new Error("boom");
    };
    registerProvider(broken);
    registerProvider(provider("music", ["com.apple.Music"], src({ id: "com.apple.Music", bundleId: "com.apple.Music" })));
    const { sources } = await getMediaSources();
    expect(sources.map((s) => s.id)).toEqual(["com.apple.Music"]);
  });

  it("degrades to providers when engine missing", async () => {
    mc.isAvailable.mockResolvedValue(false);
    mc.getSource.mockResolvedValue(null);
    registerProvider(provider("music", ["com.apple.Music"], src({ id: "com.apple.Music" })));
    const { sources, engineAvailable } = await getMediaSources();
    expect(engineAvailable).toBe(false);
    expect(sources).toHaveLength(1);
  });
});

describe("stabilizeOrder", () => {
  it("preserves the previous relative order for known ids", () => {
    const sources = [src({ id: "b" }), src({ id: "a" }), src({ id: "c" })];
    const result = stabilizeOrder(["a", "b", "c"], sources);
    expect(result.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("appends new ids in their given order after known ones", () => {
    const sources = [src({ id: "b" }), src({ id: "new2" }), src({ id: "a" }), src({ id: "new1" })];
    const result = stabilizeOrder(["a", "b"], sources);
    expect(result.map((s) => s.id)).toEqual(["a", "b", "new2", "new1"]);
  });

  it("drops ids from prev that are no longer present", () => {
    const sources = [src({ id: "a" })];
    const result = stabilizeOrder(["z", "a", "y"], sources);
    expect(result.map((s) => s.id)).toEqual(["a"]);
  });

  it("returns sources as-is order when prev is empty", () => {
    const sources = [src({ id: "a" }), src({ id: "b" })];
    expect(stabilizeOrder([], sources).map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("controlSource", () => {
  it("routes to owning provider", async () => {
    const control = vi.fn();
    registerProvider(provider("spotify", ["com.spotify.client"], null, control));
    await controlSource(src({ bundleId: "com.spotify.client" }), "next");
    expect(control).toHaveBeenCalledWith("next");
    expect(mc.control).not.toHaveBeenCalled();
  });
  it("falls back to media-control", async () => {
    await controlSource(src({ bundleId: "com.unknown.app" }), "playpause");
    expect(mc.control).toHaveBeenCalledWith("playpause");
  });
});
