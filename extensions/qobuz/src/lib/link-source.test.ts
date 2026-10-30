import { describe, it, expect } from "vitest";
import { pickLink, sourceLabel } from "./link-source";

const SPOTIFY = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC";
const YT_MUSIC = "https://music.youtube.com/watch?v=dQw4w9WgXcQ";
const QOBUZ = "https://open.qobuz.com/track/12345";

describe("pickLink", () => {
  it("prefers a typed link over the clipboard", () => {
    expect(pickLink(QOBUZ, SPOTIFY)).toEqual({ url: QOBUZ, origin: "link", service: "qobuz" });
  });

  it("keeps a typed link that is not a track link, so its failure is reported", () => {
    const album = "https://open.spotify.com/album/1";
    expect(pickLink(album, SPOTIFY)).toEqual({ url: album, origin: "link", service: "spotify" });
  });

  it("falls back to a track link on the clipboard", () => {
    expect(pickLink("  ", ` ${YT_MUSIC}\n`)).toEqual({ url: YT_MUSIC, origin: "clipboard", service: "youtube-music" });
  });

  it("ignores a clipboard that holds no track link", () => {
    expect(pickLink("", "groceries: eggs, milk")).toBeUndefined();
    expect(pickLink("", "https://open.spotify.com/playlist/1")).toBeUndefined();
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
