import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RemoteTrack } from "../../shared/remote-protocol";

vi.mock("../api", () => ({ searchTracks: vi.fn(), searchPlaylists: vi.fn(), searchAlbums: vi.fn() }));

import { searchAlbums, searchPlaylists, searchTracks, type SearchPage } from "../api";
import type { LibraryPlaylist } from "../mapping";
import { fetchOnlineResults, isFullPage, loadPage, onlineSections, uniqueById } from "../onlineSearch";

const track = (id: number): RemoteTrack => ({
  trackId: id,
  trackUrl: `https://soundcloud.com/a/${id}`,
  title: `Track ${id}`,
  artist: "Artist",
  artistId: 1,
  artworkUrl: null,
  durationMs: 1000,
  waveformUrl: null,
});

const playlist = (id: number): LibraryPlaylist => ({
  id,
  title: `Playlist ${id}`,
  username: "Owner",
  userId: 1,
  artworkUrl: null,
  trackCount: 3,
  duration: 0,
  permalinkUrl: `https://soundcloud.com/owner/sets/${id}`,
  isOwned: false,
  isPublic: true,
  secretToken: null,
});

function range<T>(count: number, make: (id: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => make(index + 1));
}

describe("isFullPage", () => {
  it("is true only when the page is full", () => {
    expect(isFullPage(10, 10)).toBe(true);
    expect(isFullPage(9, 10)).toBe(false);
    expect(isFullPage(0, 10)).toBe(false);
  });
});

describe("loadPage", () => {
  it("requests the page at offset page * 20 and reports more when full", async () => {
    const search = vi
      .fn<(query: string, page: SearchPage) => Promise<RemoteTrack[]>>()
      .mockResolvedValue(range(20, track));
    const page = await loadPage(search, "house", 2);
    expect(search).toHaveBeenCalledWith("house", { limit: 20, offset: 40 });
    expect(page).toEqual({ data: range(20, track), hasMore: true });
  });

  it("stops when the page is not full", async () => {
    const search = vi
      .fn<(query: string, page: SearchPage) => Promise<RemoteTrack[]>>()
      .mockResolvedValue(range(5, track));
    expect((await loadPage(search, "house", 0)).hasMore).toBe(false);
  });
});

describe("fetchOnlineResults", () => {
  beforeEach(() => {
    vi.mocked(searchTracks).mockResolvedValue([track(1)]);
    vi.mocked(searchPlaylists).mockResolvedValue([playlist(2)]);
    vi.mocked(searchAlbums).mockResolvedValue([playlist(3)]);
  });

  it("searches the three kinds with the first page of 3", async () => {
    const results = await fetchOnlineResults("house");
    const firstPage = { limit: 3, offset: 0 };
    expect(searchTracks).toHaveBeenCalledWith("house", firstPage);
    expect(searchPlaylists).toHaveBeenCalledWith("house", firstPage);
    expect(searchAlbums).toHaveBeenCalledWith("house", firstPage);
    expect(results).toEqual({ tracks: [track(1)], playlists: [playlist(2)], albums: [playlist(3)] });
  });
});

describe("onlineSections", () => {
  it("orders tracks, playlists, albums, drops empty kinds and flags full pages", () => {
    const tracks = range(3, track);
    const albums = range(2, playlist);
    expect(onlineSections({ tracks, playlists: [], albums })).toEqual([
      { kind: "tracks", title: "Tracks", results: { kind: "tracks", tracks }, showAll: true },
      { kind: "albums", title: "Albums", results: { kind: "playlists", playlists: albums }, showAll: false },
    ]);
  });
});

describe("uniqueById", () => {
  it("keeps the first occurrence of each id across pages", () => {
    const pages = [playlist(1), playlist(2), { ...playlist(1), title: "Again" }, playlist(3)];
    expect(uniqueById(pages)).toEqual([playlist(1), playlist(2), playlist(3)]);
  });
});
