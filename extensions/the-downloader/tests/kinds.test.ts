import { describe, it, expect } from "vitest";
import { canChat, hostOf, itemNoun, safeImageUrl } from "../src/lib/kinds";

describe("safeImageUrl", () => {
  it("keeps https URLs and escapes parentheses for Markdown", () => {
    expect(safeImageUrl("https://i.ytimg.com/vi/x/hq.jpg")).toBe("https://i.ytimg.com/vi/x/hq.jpg");
    expect(safeImageUrl("https://cdn.example.com/a (1).jpg")).toBe("https://cdn.example.com/a%20%281%29.jpg");
  });

  it("drops anything that isn't https", () => {
    expect(safeImageUrl("http://example.com/a.jpg")).toBeUndefined();
    expect(safeImageUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeImageUrl("not a url")).toBeUndefined();
    expect(safeImageUrl(undefined)).toBeUndefined();
  });
});

describe("hostOf / itemNoun", () => {
  it("strips www and names counters", () => {
    expect(hostOf("https://www.youtube.com/watch?v=1")).toBe("youtube.com");
    expect(itemNoun("spotify")).toBe("track");
    expect(itemNoun("gallery")).toBe("file");
  });
});

describe("canChat", () => {
  it("offers chat for downloads made from a video page", () => {
    expect(["video", "audio", "transcript", "thumbnail"].every((k) => canChat(k as never))).toBe(true);
    expect(["gallery", "spotify", "website"].some((k) => canChat(k as never))).toBe(false);
  });
});
