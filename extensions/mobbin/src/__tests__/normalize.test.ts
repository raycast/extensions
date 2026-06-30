import { describe, expect, it } from "vitest";
import { findScreensInMcpResult, normalizeScreens } from "../lib/normalize";

describe("normalizeScreens", () => {
  it("normalizes REST screen results", () => {
    const screens = normalizeScreens(
      {
        screens: [
          {
            id: "screen-1",
            image_url: "https://example.com/screen.png",
            mobbin_url: "https://mobbin.com/screen",
            app_name: "Example",
            platform: "ios",
          },
        ],
      },
      "web",
      "api",
    );

    expect(screens).toEqual([
      {
        id: "screen-1",
        image_url: "https://example.com/screen.png",
        mobbin_url: "https://mobbin.com/screen",
        app_name: "Example",
        platform: "ios",
        source: "api",
      },
    ]);
  });

  it("falls back to the requested platform and drops incomplete records", () => {
    const screens = normalizeScreens(
      [
        {
          id: "screen-1",
          imageUrl: "https://example.com/screen.png",
          mobbinUrl: "https://mobbin.com/screen",
          appName: "Example",
        },
        { id: "bad" },
      ],
      "web",
      "mcp",
    );

    expect(screens).toHaveLength(1);
    expect(screens[0]?.platform).toBe("web");
    expect(screens[0]?.source).toBe("mcp");
  });
});

describe("findScreensInMcpResult", () => {
  it("extracts JSON screens from MCP text content", () => {
    const result = findScreensInMcpResult({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            screens: [
              {
                id: "screen-1",
                image_url: "https://example.com/screen.png",
                mobbin_url: "https://mobbin.com/screen",
                app_name: "Example",
                platform: "ios",
              },
            ],
          }),
        },
      ],
    });

    expect(normalizeScreens(result, "ios", "mcp")).toHaveLength(1);
  });
});
