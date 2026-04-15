import { describe, expect, it } from "vitest";

import { buildPublicUrl } from "../url";

describe("buildPublicUrl", () => {
  it("joins base URL and key cleanly", () => {
    const url = buildPublicUrl("https://shots.example.com/", "/2026/02/18/file.webp");
    expect(url).toBe("https://shots.example.com/2026/02/18/file.webp");
  });

  it("encodes key path segments", () => {
    const url = buildPublicUrl("https://shots.example.com", "2026/02/18/my file.webp");
    expect(url).toBe("https://shots.example.com/2026/02/18/my%20file.webp");
  });
});
