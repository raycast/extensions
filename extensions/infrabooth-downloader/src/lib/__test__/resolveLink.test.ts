import { describe, expect, it } from "vitest";
import type { TrackInfo } from "@/bindings";
import {
  mapResolvedLink,
  resolvedTitle,
  systemPlaylistTracks,
  toLibraryPlaylist,
  type ResolvedLinkJson,
} from "../resolveLink";

const trackJson: TrackInfo = {
  id: 42,
  title: "Song",
  user: { id: 7, username: "Artist", avatar_url: null },
  artwork_url: "https://example.com/a.jpg",
  duration: 1000,
  permalink_url: "https://soundcloud.com/artist/song",
  waveform_url: null,
  downloadable: false,
  download_url: "https://dl",
  secret_token: "s-tok",
  preview_only: false,
} as TrackInfo;

const remoteTrack = {
  trackId: 42,
  trackUrl: "https://soundcloud.com/artist/song",
  title: "Song",
  artist: "Artist",
  artistId: 7,
  artworkUrl: "https://example.com/a.jpg",
  durationMs: 1000,
  waveformUrl: null,
};

describe("mapResolvedLink", () => {
  it("maps a track and keeps its secret token and download url", () => {
    expect(mapResolvedLink({ kind: "track", track: trackJson })).toEqual({
      kind: "track",
      track: remoteTrack,
      secretToken: "s-tok",
      downloadUrl: "https://dl",
    });
  });

  it("maps a playlist and forwards the raw tracks untouched", () => {
    const json: ResolvedLinkJson = {
      kind: "playlist",
      playlist: {
        id: 9,
        title: "My Set",
        user: { id: 3, username: "Owner", avatar_url: null },
        artwork_url: null,
        track_count: 2,
        tracks: [trackJson],
        secret_token: "s-AbC12",
      },
    };
    const link = mapResolvedLink(json);
    expect(link).toEqual({
      kind: "playlist",
      playlist: {
        id: 9,
        ownerId: 3,
        title: "My Set",
        owner: "Owner",
        artworkUrl: null,
        trackCount: 2,
        tracks: [trackJson],
        secretToken: "s-AbC12",
      },
    });
    expect(link.kind === "playlist" && link.playlist.tracks).toBe(json.kind === "playlist" && json.playlist.tracks);
    expect(resolvedTitle(link)).toBe("My Set");
  });
});

describe("toLibraryPlaylist", () => {
  const playlist = {
    id: 9,
    ownerId: 3,
    title: "My Set",
    owner: "Owner",
    artworkUrl: null,
    trackCount: 2,
    tracks: [trackJson, trackJson],
    secretToken: null,
  };

  it("builds a public library playlist from a pasted link", () => {
    expect(toLibraryPlaylist(playlist, "soundcloud.com/owner/sets/my-set")).toEqual({
      id: 9,
      title: "My Set",
      username: "Owner",
      userId: 3,
      artworkUrl: null,
      trackCount: 2,
      duration: 2000,
      permalinkUrl: "https://soundcloud.com/owner/sets/my-set",
      isOwned: false,
      isPublic: true,
      secretToken: null,
    });
  });

  it("keeps the secret token the backend resolved, even for a short link", () => {
    const library = toLibraryPlaylist({ ...playlist, secretToken: "s-AbC12" }, "https://on.soundcloud.com/xyz");
    expect(library).toMatchObject({
      secretToken: "s-AbC12",
      isPublic: false,
      permalinkUrl: "https://on.soundcloud.com/xyz",
    });
  });
});

describe("systemPlaylistTracks", () => {
  const playlist = {
    id: 9,
    ownerId: 3,
    title: "My Set",
    owner: "Owner",
    artworkUrl: null,
    trackCount: 1,
    tracks: [trackJson],
    secretToken: null,
  };

  it("maps the resolved tracks of a system playlist, which has no real id", () => {
    const tracks = systemPlaylistTracks({ ...playlist, id: 0 });
    expect(tracks?.map((track) => track.trackId)).toEqual([42]);
  });

  it("is undefined for a regular playlist", () => {
    expect(systemPlaylistTracks(playlist)).toBeUndefined();
  });
});
