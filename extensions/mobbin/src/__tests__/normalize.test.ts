import { describe, expect, it } from "vitest";
import {
  extractMcpPayloads,
  normalizeFlows,
  normalizeScreens,
  normalizeSections,
} from "../lib/normalize";
import {
  mcpFlowFixture,
  mcpScreenFixture,
  mcpSectionFixture,
} from "./fixtures/mcp-structures";

describe("reference normalization", () => {
  it("normalizes documented REST screens and nested image metadata", () => {
    const screens = normalizeScreens(
      {
        screens: [
          {
            id: "screen-1",
            image: {
              url: "https://example.com/screen.webp",
              url_expires_at: "2030-01-01T00:00:00Z",
              width: 100,
              height: 200,
            },
            mobbin_url: "https://mobbin.com/screen",
            app_name: "Example",
          },
        ],
      },
      "ios",
      "api",
    );
    expect(screens).toEqual([
      expect.objectContaining({
        kind: "screen",
        id: "screen-1",
        appName: "Example",
        image: {
          url: "https://example.com/screen.webp",
          expiresAt: "2030-01-01T00:00:00Z",
          width: 100,
          height: 200,
        },
      }),
    ]);
  });

  it("normalizes ordered flow screens and inherits parent metadata", () => {
    const flows = normalizeFlows(
      {
        flows: [
          {
            id: "flow-1",
            name: "Sign Up",
            app_name: "Example",
            mobbin_url: "https://mobbin.com/flows/1",
            screens: [
              { id: "one", image_url: "https://example.com/one.webp" },
              { id: "two", image_url: "https://example.com/two.webp" },
            ],
          },
        ],
      },
      "ios",
      "mcp",
    );
    expect(flows[0]).toMatchObject({
      kind: "flow",
      title: "Sign Up",
      screens: [{ id: "one" }, { id: "two" }],
    });
  });

  it("normalizes website sections and drops incomplete records", () => {
    const sections = normalizeSections(
      {
        sections: [
          {
            id: "section-1",
            title: "Pricing",
            website_name: "Example",
            image_url: "https://example.com/pricing.webp",
            mobbin_url: "https://mobbin.com/sections/1",
          },
          { id: "bad" },
        ],
      },
      "mcp",
    );
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      kind: "section",
      platform: "web",
      title: "Pricing",
    });
  });

  it("normalizes sanitized live-compatible aliases and inline images", () => {
    const screens = normalizeScreens(mcpScreenFixture, "ios", "mcp");
    expect(screens[0]).toMatchObject({
      id: "screen-example",
      image: {
        dataUrl: "data:image/png;base64,AA==",
        width: 390,
        height: 844,
      },
    });

    const flows = normalizeFlows(mcpFlowFixture, "ios", "mcp");
    expect(flows[0]?.screens.map((screen) => screen.id)).toEqual([
      "flow-screen-one",
      "flow-screen-two",
    ]);

    const sections = normalizeSections(mcpSectionFixture, "mcp");
    expect(sections[0]).toMatchObject({
      id: "section-example",
      appName: "example.invalid",
      platform: "web",
      image: { dataUrl: "data:image/webp;base64,AA==" },
    });
  });

  it("deduplicates repeated screen IDs", () => {
    const duplicate = mcpScreenFixture.screens[0];
    expect(
      normalizeScreens({ screens: [duplicate, duplicate] }, "ios", "mcp"),
    ).toHaveLength(1);
  });
});

describe("extractMcpPayloads", () => {
  it("prefers structured content and reads every JSON text block", () => {
    const payloads = extractMcpPayloads({
      structuredContent: { screens: [] },
      content: [
        { type: "text", text: "prose" },
        { type: "text", text: JSON.stringify({ screens: [{ id: "one" }] }) },
        { type: "text", text: JSON.stringify({ screens: [{ id: "two" }] }) },
      ],
    });
    expect(payloads).toEqual([
      { screens: [] },
      { screens: [{ id: "one" }] },
      { screens: [{ id: "two" }] },
    ]);
  });
});
