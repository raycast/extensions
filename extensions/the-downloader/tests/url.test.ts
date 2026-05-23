import { describe, it, expect } from "vitest";
import { isValidUrl } from "../src/lib/url";

describe("isValidUrl", () => {
  it("accepts https URLs", () => {
    expect(isValidUrl("https://www.youtube.com/watch?v=abc")).toBe(true);
    expect(isValidUrl("https://open.spotify.com/track/x")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isValidUrl("http://example.com/page")).toBe(true);
  });

  it("accepts protocol-less URLs (caller prepends https:// at use sites)", () => {
    expect(isValidUrl("youtube.com/watch?v=abc")).toBe(true);
    expect(isValidUrl("example.com")).toBe(true);
  });

  it("rejects javascript: URLs", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects file: URLs (a paste from the local filesystem must not route to yt-dlp)", () => {
    expect(isValidUrl("file:///etc/passwd")).toBe(false);
    expect(isValidUrl("file:///Users/me/secret.txt")).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(isValidUrl("data:text/plain,hello")).toBe(false);
  });

  it("rejects ftp: URLs — yt-dlp/gallery-dl/monolith are not meant for FTP", () => {
    expect(isValidUrl("ftp://example.com/file.mp4")).toBe(false);
  });

  it("rejects empty / whitespace / nonsense strings", () => {
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("   ")).toBe(false);
    expect(isValidUrl("not a url")).toBe(false);
  });
});
