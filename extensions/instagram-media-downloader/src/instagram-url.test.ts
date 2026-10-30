import { describe, expect, it } from "vitest";
import {
  canonicalPostUrl,
  commandForInstagramUrl,
  parseInstagramPostUrl,
  parseInstagramStoryUrl,
} from "./instagram-url";

describe("parseInstagramPostUrl", () => {
  it.each([
    ["https://www.instagram.com/p/AbCdEfGhIjK/", "AbCdEfGhIjK", "post"],
    ["https://www.instagram.com/p/AbCdEfGhIjK/?utm_source=ig_web_copy_link&xtok=abc", "AbCdEfGhIjK", "post"],
    ["https://instagram.com/reel/Ab-Cd_EfGhI", "Ab-Cd_EfGhI", "reel"],
    ["https://www.instagram.com/reels/AbCdEfGhIjK/", "AbCdEfGhIjK", "reel"],
    ["https://m.instagram.com/p/AbCdEfGhIjK/", "AbCdEfGhIjK", "post"],
    ["https://www.instagram.com/example_user/p/AbCdEfGhIjK/", "AbCdEfGhIjK", "post"],
    ["https://www.instagram.com/example_user/reel/AbCdEfGhIjK/", "AbCdEfGhIjK", "reel"],
    ["https://www.instagram.com/example_user/reels/AbCdEfGhIjK/", "AbCdEfGhIjK", "reel"],
    ["  https://www.instagram.com/p/AbCdEfGhIjK/  ", "AbCdEfGhIjK", "post"],
    ["instagram.com/p/AbCdEfGhIjK/", "AbCdEfGhIjK", "post"],
    ["www.instagram.com/example_user/reel/AbCdEfGhIjK", "AbCdEfGhIjK", "reel"],
  ])("reads %s", (url, shortcode, kind) => {
    expect(parseInstagramPostUrl(url)).toEqual({ shortcode, kind });
  });

  it.each([
    ["not a url"],
    ["ftp://www.instagram.com/p/AbCdEfGhIjK/"],
    ["javascript:alert(1)//www.instagram.com/p/AbCdEfGhIjK/"],
    ["evil.example/www.instagram.com/p/AbCdEfGhIjK/"],
    ["https://evil.example/www.instagram.com/p/AbCdEfGhIjK/"],
    ["https://instagram.com.evil.example/p/AbCdEfGhIjK/"],
    ["https://user:pass@www.instagram.com/p/AbCdEfGhIjK/"],
    ["https://www.instagram.com/example_user/"],
    ["https://www.instagram.com/stories/example_user/1234567890/"],
    ["https://www.instagram.com/p/"],
    ["https://www.instagram.com/p/Ab.Cd/"],
    ["https://www.instagram.com/a/b/p/AbCdEfGhIjK/"],
  ])("rejects %s", (url) => {
    expect(parseInstagramPostUrl(url)).toBeNull();
  });
});

describe("canonicalPostUrl", () => {
  it("drops the username and every tracking parameter", () => {
    expect(canonicalPostUrl({ shortcode: "AbCdEfGhIjK", kind: "reel" })).toBe(
      "https://www.instagram.com/reel/AbCdEfGhIjK/",
    );
    expect(canonicalPostUrl({ shortcode: "AbCdEfGhIjK", kind: "post" })).toBe(
      "https://www.instagram.com/p/AbCdEfGhIjK/",
    );
  });
});

describe("parseInstagramStoryUrl", () => {
  it.each([
    [
      "https://www.instagram.com/stories/example_user/1234567890123456789/",
      { kind: "story", user: "example_user", storyId: "1234567890123456789" },
    ],
    ["instagram.com/stories/example_user/", { kind: "story", user: "example_user" }],
    [
      "https://www.instagram.com/stories/highlights/12345678901234567/?igsh=x",
      { kind: "highlight", highlightId: "12345678901234567" },
    ],
  ])("reads %s", (url, expected) => {
    expect(parseInstagramStoryUrl(url)).toEqual(expected);
  });

  it.each([
    ["https://www.instagram.com/p/AbCdEfGhIjK/"],
    ["https://evil.example/stories/example_user/1/"],
    ["https://www.instagram.com/stories/highlights/"],
    ["https://www.instagram.com/stories/highlights/abc/"],
    ["https://www.instagram.com/stories/example_user/not-a-number/"],
    ["https://www.instagram.com/stories/"],
  ])("rejects %s", (url) => {
    expect(parseInstagramStoryUrl(url)).toBeNull();
  });
});

describe("commandForInstagramUrl", () => {
  it.each([
    ["instagram.com/p/AbCdEfGhIjK/", "download-instagram-media"],
    ["https://www.instagram.com/example_user/reel/AbCdEfGhIjK/", "download-instagram-media"],
    ["https://www.instagram.com/stories/example_user/1234567890/", "download-instagram-story"],
    ["https://www.instagram.com/stories/highlights/12345678901234567/", "download-instagram-highlight-story"],
    ["https://www.instagram.com/example_user/", null],
    ["https://evil.example/stories/highlights/1/", null],
  ])("routes %s to %s", (url, command) => {
    expect(commandForInstagramUrl(url)).toBe(command);
  });
});
