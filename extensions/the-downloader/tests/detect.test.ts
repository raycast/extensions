import { describe, it, expect } from "vitest";
import { detectSource } from "../src/lib/detect";

describe("detectSource", () => {
  it("routes known video domains to video", () => {
    expect(detectSource("https://www.youtube.com/watch?v=abc")).toBe("video");
    expect(detectSource("https://youtu.be/abc")).toBe("video");
    expect(detectSource("https://twitch.tv/stream")).toBe("video");
    expect(detectSource("https://vimeo.com/123")).toBe("video");
  });

  it("routes known gallery domains to gallery", () => {
    expect(detectSource("https://www.reddit.com/r/pics")).toBe("gallery");
    expect(detectSource("https://imgur.com/a/abc")).toBe("gallery");
    expect(detectSource("https://www.pixiv.net/en/users/123")).toBe("gallery");
  });

  it("routes Pinterest variants — pin.it short links and regional TLDs — to gallery", () => {
    expect(detectSource("https://www.pinterest.com/user/board/")).toBe("gallery");
    expect(detectSource("https://pin.it/2xYzAbc")).toBe("gallery");
    expect(detectSource("https://pinterest.de/user/")).toBe("gallery");
    expect(detectSource("https://www.pinterest.co.uk/user/")).toBe("gallery");
    expect(detectSource("https://in.pinterest.com/user/")).toBe("gallery");
  });

  it("does not misclassify lookalike hosts as Pinterest", () => {
    expect(detectSource("https://notpinterest.com/page")).toBe("webpage");
  });

  it("routes Spotify links to spotify", () => {
    expect(detectSource("https://open.spotify.com/track/abc")).toBe("spotify");
    expect(detectSource("https://open.spotify.com/playlist/xyz")).toBe("spotify");
    expect(detectSource("https://open.spotify.com/album/123")).toBe("spotify");
  });

  it("routes any other site to webpage", () => {
    expect(detectSource("https://en.wikipedia.org/wiki/Raycast")).toBe("webpage");
    expect(detectSource("https://news.ycombinator.com/item?id=1")).toBe("webpage");
    expect(detectSource("https://accounts.spotify.com/login")).toBe("webpage");
  });

  it("handles URLs without a protocol", () => {
    expect(detectSource("youtube.com/watch?v=abc")).toBe("video");
    expect(detectSource("example.com/article")).toBe("webpage");
  });

  it("routes an unparseable URL to webpage", () => {
    expect(detectSource("not a url")).toBe("webpage");
  });
});
