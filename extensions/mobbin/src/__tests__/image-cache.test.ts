import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  environment: {
    supportPath: "/tmp/mobbin-raycast-test",
  },
  Clipboard: {
    copy: vi.fn(),
    paste: vi.fn(),
  },
}));

describe("getImageCachePath", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates deterministic paths from screen id and image URL", async () => {
    const { getImageCachePath } = await import("../lib/image-cache");
    const screen = {
      id: "screen-1",
      image_url: "https://example.com/screen.png",
      mobbin_url: "https://mobbin.com/screen",
      app_name: "Example",
      platform: "ios" as const,
      source: "api" as const,
    };

    expect(getImageCachePath(screen)).toBe(getImageCachePath(screen));
    expect(getImageCachePath(screen)).toContain("/tmp/mobbin-raycast-test/images/screen-1-");
  });
});
