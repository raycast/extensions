import { describe, it, expect } from "vitest";
import { linkKind, looksLikeOpenableLink, parseSpotifyAlbum, pickAlbumMatch } from "./resolve";

describe("linkKind", () => {
  it.each([
    ["https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", "track"],
    ["https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa", "album"],
    ["https://open.spotify.com/playlist/1", "playlist"],
    ["https://open.spotify.com/artist/1", "artist"],
    ["https://open.spotify.com/show/1", "podcast"],
    ["https://open.spotify.com/episode/1", "podcast"],
    ["https://www.qobuz.com/gb-en/album/random-access-memories-daft-punk/0886443927087", "album"],
    ["https://open.qobuz.com/album/apk748lfvcgxb", "album"],
    ["https://open.qobuz.com/track/12345", "track"],
    ["https://open.qobuz.com/playlist/1", "playlist"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ", "track"],
    ["https://music.youtube.com/playlist?list=OLAK5uy_nZZjkBu_E4olFSb5Ey-fQ-4a0ZCqJICdQ", "album"],
    ["https://music.youtube.com/browse/MPREb_abc", "album"],
    ["https://music.youtube.com/playlist?list=PL123", "playlist"],
  ])("reads %s as %s", (url, kind) => {
    expect(linkKind(url)).toBe(kind);
  });

  it("knows nothing of other services or plain text", () => {
    expect(linkKind("https://example.com/album/1")).toBeUndefined();
    expect(linkKind("groceries")).toBeUndefined();
  });
});

describe("looksLikeOpenableLink", () => {
  it("accepts tracks and albums only", () => {
    expect(looksLikeOpenableLink("https://open.spotify.com/album/1")).toBe(true);
    expect(looksLikeOpenableLink("https://open.spotify.com/track/1")).toBe(true);
    expect(looksLikeOpenableLink("https://open.spotify.com/playlist/1")).toBe(false);
  });
});

describe("parseSpotifyAlbum", () => {
  it("reads title, artist, year and track count from the preview tags", () => {
    expect(
      parseSpotifyAlbum(
        "Listen to Random Access Memories - Album by Daft Punk | Spotify",
        "Daft Punk · album · 2013 · 13 songs",
      ),
    ).toEqual({ title: "Random Access Memories", artist: "Daft Punk", year: 2013, tracksCount: 13 });
  });

  it("keeps a dash inside the album title", () => {
    expect(
      parseSpotifyAlbum("Listen to Live - 1975 - EP by Some Band | Spotify", "Some Band · EP · 1975 · 1 song"),
    ).toMatchObject({ title: "Live - 1975", tracksCount: 1 });
  });
});

const album = (title: string, artist: string, extra: { upc?: string; year?: number; tracksCount?: number } = {}) => ({
  title,
  artist: { name: artist },
  ...extra,
});

const SOURCE = { title: "Random Access Memories", artist: "Daft Punk", year: 2013, tracksCount: 13 };

describe("pickAlbumMatch", () => {
  it("is exact on a shared UPC, whatever its leading zeros", () => {
    const anniversary = album("Random Access Memories (10th Anniversary Edition)", "Daft Punk", {
      upc: "0196589921154",
    });
    const original = album("Random Access Memories", "Daft Punk", { upc: "0886443927087" });
    expect(pickAlbumMatch(SOURCE, [anniversary, original], "886443927087")).toEqual({ album: original, exact: true });
  });

  it("prefers the edition whose year and track count agree", () => {
    const anniversary = album("Random Access Memories (10th Anniversary Edition)", "Daft Punk", {
      year: 2023,
      tracksCount: 22,
    });
    const original = album("Random Access Memories", "Daft Punk", { year: 2013, tracksCount: 13 });
    expect(pickAlbumMatch(SOURCE, [anniversary, original])).toEqual({ album: original, exact: false });
  });

  it("keeps the search order when nothing tells the candidates apart", () => {
    const first = album("Random Access Memories", "Daft Punk");
    const second = album("Random Access Memories (Drumless Edition)", "Daft Punk");
    expect(pickAlbumMatch({ title: SOURCE.title, artist: SOURCE.artist }, [first, second])?.album).toBe(first);
  });

  it("rejects an unrelated album, even one naming the source", () => {
    const tribute = album(
      "Vitamin String Quartet Performs Daft Punk's Random Access Memories",
      "Vitamin String Quartet",
    );
    const other = album("Discovery", "Daft Punk", { year: 2013, tracksCount: 13 });
    expect(pickAlbumMatch(SOURCE, [tribute, other], "000000000000")).toBeUndefined();
  });
});
