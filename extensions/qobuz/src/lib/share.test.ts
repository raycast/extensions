import { describe, it, expect, vi, beforeEach } from "vitest";
import { shareLinks } from "./share";
import type { Track } from "@kud/qobuz";

const mockTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 123,
  title: "Test Track",
  artist: { name: "Test Artist" },
  album: { id: 456, title: "Test Album", image: { small: "", large: "" } },
  duration: 200,
  hires: true,
  isrc: "USRC12345678",
  ...overrides,
});

const mockFetch = (responses: Map<string, unknown>) => {
  vi.mocked(fetch).mockImplementation(async (url: string | URL) => {
    const key = url.toString();
    const response = responses.get(key);
    if (response === undefined) {
      return new Response(null, { status: 404 });
    }
    return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
  });
};

describe("shareLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to search URLs when all lookups fail", async () => {
    mockFetch(new Map());
    const track = mockTrack({ isrc: "USRC12345678" });
    const links = await shareLinks(track);

    const byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.qobuz.confidence).toBe("exact");
    expect(byPlatform.spotify.confidence).toBe("search");
    expect(byPlatform.spotify.url).toContain("open.spotify.com/search/");
    expect(byPlatform.apple.confidence).toBe("search");
    expect(byPlatform.apple.url).toContain("music.apple.com/search");
    expect(byPlatform.deezer).toBeUndefined();
    expect(byPlatform.tidal.confidence).toBe("search");
    expect(byPlatform.tidal.url).toContain("tidal.com/search");
    expect(byPlatform.songlink).toBeUndefined();
  });

  it("rejects lookalike Tidal host (faketidal.com)", async () => {
    const streamingResponse = {
      recordings: [
        {
          relations: [
            { url: { resource: "https://faketidal.com/track/12345" } },
            { url: { resource: "https://open.spotify.com/track/spotify123" } },
          ],
        },
      ],
    };
    mockFetch(
      new Map([
        ["https://musicbrainz.org/ws/2/isrc/USRC12345678?inc=url-rels&fmt=json", streamingResponse],
        ["https://api.deezer.com/track/isrc:USRC12345678", { id: 999, link: "https://deezer.com/track/999" }],
      ]),
    );
    const track = mockTrack({ isrc: "USRC12345678" });
    const links = await shareLinks(track);

    const byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.tidal.confidence).toBe("search");
    expect(byPlatform.tidal.url).toContain("tidal.com/search");
    expect(byPlatform.spotify.confidence).toBe("exact");
    expect(byPlatform.spotify.url).toBe("https://open.spotify.com/track/spotify123");
  });

  it("Apple album URL without ?i= is not exact", async () => {
    const streamingResponse = {
      recordings: [
        {
          relations: [{ url: { resource: "https://music.apple.com/us/album/test-album/123456" } }],
        },
      ],
    };
    mockFetch(new Map([["https://musicbrainz.org/ws/2/isrc/USRC12345678?inc=url-rels&fmt=json", streamingResponse]]));
    const track = mockTrack({ isrc: "USRC12345678" });
    const links = await shareLinks(track);

    const byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.apple.confidence).toBe("search");
    expect(byPlatform.apple.url).toContain("music.apple.com/search");
  });

  it("Apple album URL with ?i= track ID is exact", async () => {
    const streamingResponse = {
      recordings: [
        {
          relations: [{ url: { resource: "https://music.apple.com/us/album/test-album/123456?i=789" } }],
        },
      ],
    };
    mockFetch(new Map([["https://musicbrainz.org/ws/2/isrc/USRC12345678?inc=url-rels&fmt=json", streamingResponse]]));
    const track = mockTrack({ isrc: "USRC12345678" });
    const links = await shareLinks(track);

    const byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.apple.confidence).toBe("exact");
    expect(byPlatform.apple.url).toBe("https://music.apple.com/us/album/test-album/123456?i=789");
  });

  it("Apple song URL with a country prefix is exact and feeds song.link", async () => {
    const streamingResponse = {
      recordings: [{ relations: [{ url: { resource: "https://music.apple.com/gb/song/test-track/1440833098" } }] }],
    };
    mockFetch(
      new Map([
        ["https://musicbrainz.org/ws/2/isrc/USRC12345678?inc=url-rels&fmt=json", streamingResponse],
        ["https://api.deezer.com/track/isrc:USRC12345678", {}],
      ]),
    );
    const links = await shareLinks(mockTrack({ isrc: "USRC12345678" }));

    const byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.apple.confidence).toBe("exact");
    expect(byPlatform.songlink.url).toBe("https://song.link/i/1440833098");
  });

  it("approximate iTunes match does not produce exact song.link", async () => {
    const itunesResponse = {
      results: [
        {
          trackName: "Test Track",
          artistName: "Test Artist",
          trackViewUrl: "https://music.apple.com/us/album/test-track/12345?i=789",
          trackId: 789,
        },
      ],
    };
    mockFetch(
      new Map([
        ["https://musicbrainz.org/ws/2/isrc/USRC12345678?inc=url-rels&fmt=json", { recordings: [] }],
        ["https://api.deezer.com/track/isrc:USRC12345678", {}],
        ["https://itunes.apple.com/search?term=Test%20Artist%20Test%20Track&entity=song&limit=5", itunesResponse],
      ]),
    );
    const track = mockTrack({ isrc: "USRC12345678" });
    const links = await shareLinks(track);

    const byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.apple.confidence).toBe("approximate");
    expect(byPlatform.songlink).toBeUndefined();
  });

  it("MusicBrainz Spotify URL produces /s/ song.link", async () => {
    const streamingResponse = {
      recordings: [
        {
          relations: [{ url: { resource: "https://open.spotify.com/track/spotify123" } }],
        },
      ],
    };
    mockFetch(
      new Map([
        ["https://musicbrainz.org/ws/2/isrc/USRC12345678?inc=url-rels&fmt=json", streamingResponse],
        ["https://api.deezer.com/track/isrc:USRC12345678", {}], // Deezer miss
      ]),
    );
    const track = mockTrack({ isrc: "USRC12345678" });
    const links = await shareLinks(track);

    const byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.spotify.confidence).toBe("exact");
    expect(byPlatform.songlink).toBeDefined();
    expect(byPlatform.songlink!.url).toBe("https://song.link/s/spotify123");
    expect(byPlatform.songlink!.confidence).toBe("exact");
  });

  it("song.link fallback order: Deezer -> MusicBrainz Spotify -> MusicBrainz Apple", async () => {
    // Test Deezer takes priority
    const streamingWithSpotify = {
      recordings: [{ relations: [{ url: { resource: "https://open.spotify.com/track/spotify123" } }] }],
    };
    mockFetch(
      new Map([
        ["https://musicbrainz.org/ws/2/isrc/USRC12345678?inc=url-rels&fmt=json", streamingWithSpotify],
        ["https://api.deezer.com/track/isrc:USRC12345678", { id: 999, link: "https://deezer.com/track/999" }],
      ]),
    );
    let track = mockTrack({ isrc: "USRC12345678" });
    let links = await shareLinks(track);
    let byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.songlink!.url).toBe("https://song.link/d/999");

    // Test MusicBrainz Spotify when Deezer misses
    vi.clearAllMocks();
    mockFetch(
      new Map([
        ["https://musicbrainz.org/ws/2/isrc/USRC12345678?inc=url-rels&fmt=json", streamingWithSpotify],
        ["https://api.deezer.com/track/isrc:USRC12345678", {}],
      ]),
    );
    track = mockTrack({ isrc: "USRC12345678" });
    links = await shareLinks(track);
    byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.songlink!.url).toBe("https://song.link/s/spotify123");

    // Test MusicBrainz Apple when both Deezer and Spotify miss
    const streamingWithApple = {
      recordings: [{ relations: [{ url: { resource: "https://music.apple.com/us/album/test/123?i=789" } }] }],
    };
    vi.clearAllMocks();
    mockFetch(
      new Map([
        ["https://musicbrainz.org/ws/2/isrc/USRC12345678?inc=url-rels&fmt=json", streamingWithApple],
        ["https://api.deezer.com/track/isrc:USRC12345678", {}],
      ]),
    );
    track = mockTrack({ isrc: "USRC12345678" });
    links = await shareLinks(track);
    byPlatform = Object.fromEntries(links.map((l) => [l.platform, l]));
    expect(byPlatform.songlink!.url).toBe("https://song.link/i/789");
  });
});
