import { describe, it, expect } from "vitest";
import { pickLink, sourceLabel } from "./link-source";

const SPOTIFY = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC";
const YT_MUSIC = "https://music.youtube.com/watch?v=dQw4w9WgXcQ";
const QOBUZ = "https://open.qobuz.com/track/12345";
const SPOTIFY_ALBUM = "https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa";
const YT_MUSIC_ALBUM = "https://music.youtube.com/playlist?list=OLAK5uy_nZZjkBu_E4olFSb5Ey-fQ-4a0ZCqJICdQ";
const QOBUZ_ALBUM = "https://www.qobuz.com/gb-en/album/random-access-memories-daft-punk/0886443927087";

describe("pickLink", () => {
  it("prefers a typed link over the clipboard", () => {
    expect(pickLink(QOBUZ, SPOTIFY)).toEqual({ url: QOBUZ, origin: "link", service: "qobuz" });
  });

  it("keeps a typed link that cannot be opened, so its failure is reported", () => {
    const playlist = "https://open.spotify.com/playlist/1";
    expect(pickLink(playlist, SPOTIFY)).toEqual({ url: playlist, origin: "link", service: "spotify" });
  });

  it("prefers a typed track link over an album on the clipboard", () => {
    expect(pickLink(SPOTIFY, SPOTIFY_ALBUM)).toEqual({ url: SPOTIFY, origin: "link", service: "spotify" });
  });

  it("falls back to a track link on the clipboard", () => {
    expect(pickLink("  ", ` ${YT_MUSIC}\n`)).toEqual({ url: YT_MUSIC, origin: "clipboard", service: "youtube-music" });
  });

  it("falls back to an album link on the clipboard", () => {
    expect(pickLink("", SPOTIFY_ALBUM)).toEqual({ url: SPOTIFY_ALBUM, origin: "clipboard", service: "spotify" });
    expect(pickLink("", YT_MUSIC_ALBUM)).toEqual({
      url: YT_MUSIC_ALBUM,
      origin: "clipboard",
      service: "youtube-music",
    });
    expect(pickLink("", QOBUZ_ALBUM)).toEqual({ url: QOBUZ_ALBUM, origin: "clipboard", service: "qobuz" });
  });

  it("keeps a clipboard link from a supported service that cannot be opened, so it can be named", () => {
    const playlist = "https://open.spotify.com/playlist/1";
    expect(pickLink("", playlist)).toEqual({ url: playlist, origin: "clipboard", service: "spotify" });
  });

  it("ignores a clipboard that holds no link from a supported service", () => {
    expect(pickLink("", "groceries: eggs, milk")).toBeUndefined();
    expect(pickLink("", "https://example.com/album/1")).toBeUndefined();
    expect(pickLink("", undefined)).toBeUndefined();
  });
});

describe("sourceLabel", () => {
  it("names the origin and the service", () => {
    expect(sourceLabel({ url: SPOTIFY, origin: "clipboard", service: "spotify" })).toBe("From clipboard (Spotify)");
    expect(sourceLabel({ url: YT_MUSIC, origin: "link", service: "youtube-music" })).toBe("From link (YouTube Music)");
  });

  it("leaves the service out when the link is not one we know", () => {
    expect(sourceLabel({ url: "nope", origin: "link", service: undefined })).toBe("From link");
  });
});
