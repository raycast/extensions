import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({ Icon: { Music: "music", List: "list", Shuffle: "shuffle", Globe: "globe" } }));

import type { LibraryPlaylist } from "../mapping";
import {
  filterResults,
  nextSearchType,
  SEARCH_TYPE_ORDER,
  type Results,
  withoutLibraryPlaylists,
} from "../searchTypes";

function playlist(id: number): LibraryPlaylist {
  return {
    id,
    title: `Playlist ${id}`,
    username: "me",
    userId: 1,
    artworkUrl: null,
    trackCount: 1,
    duration: 0,
    permalinkUrl: `https://soundcloud.com/me/sets/${id}`,
    isOwned: true,
    isPublic: true,
    secretToken: null,
  };
}

describe("searchTypes", () => {
  it("orders the online type last", () => {
    expect(SEARCH_TYPE_ORDER).toEqual(["tracks", "playlists", "mixes", "online"]);
  });

  it("cycles search types", () => {
    expect(nextSearchType("tracks")).toBe("playlists");
    expect(nextSearchType("mixes")).toBe("online");
    expect(nextSearchType("online")).toBe("tracks");
  });

  it("filters mixes case-insensitively by title", () => {
    const results: Results = {
      kind: "mixes",
      mixes: [
        { id: "1", title: "Your Mix 1", artworkUrl: null, tracks: [] },
        { id: "2", title: "Other", artworkUrl: null, tracks: [] },
      ],
    };
    expect(filterResults(results, "your mix")).toEqual({ kind: "mixes", mixes: [results.mixes[0]] });
    expect(filterResults(results, "")).toBe(results);
  });

  it("drops search playlists already listed in the library section", () => {
    const library: Results = { kind: "playlists", playlists: [playlist(1)] };
    const search: Results = { kind: "playlists", playlists: [playlist(1), playlist(2)] };
    expect(withoutLibraryPlaylists(search, library)).toEqual({ kind: "playlists", playlists: [playlist(2)] });
  });

  it("leaves non-playlist results untouched", () => {
    const tracks: Results = { kind: "tracks", tracks: [] };
    expect(withoutLibraryPlaylists(tracks, { kind: "playlists", playlists: [playlist(1)] })).toBe(tracks);
    expect(withoutLibraryPlaylists(undefined, undefined)).toBeUndefined();
  });
});
