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
  it("offers chat for any download but Spotify", () => {
    expect(["video", "audio", "transcript", "thumbnail", "gallery", "website"].every((k) => canChat(k as never))).toBe(
      true,
    );
    expect(canChat("spotify")).toBe(false);
  });
});

describe("safeImageUrl and local addresses", () => {
  it("refuses images on IP addresses and local names, which Raycast would fetch from this Mac", () => {
    expect(safeImageUrl("https://192.168.1.1/admin.png")).toBeUndefined();
    expect(safeImageUrl("https://[::1]/x.png")).toBeUndefined();
    expect(safeImageUrl("https://router.local/x.png")).toBeUndefined();
    expect(safeImageUrl("https://nas.internal/x.png")).toBeUndefined();
    expect(safeImageUrl("https://i.ytimg.com/vi/abc/hq.jpg")).toBe("https://i.ytimg.com/vi/abc/hq.jpg");
  });
});
