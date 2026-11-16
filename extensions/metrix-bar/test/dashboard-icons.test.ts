import { Buffer } from "node:buffer";
import { describe, expect, it } from "vite-plus/test";
import { dashboardIconSource } from "../src/lib/dashboard-icons";

const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M0 0h24v24H0z"/></svg>';

describe("dashboard icons", () => {
  it.each([
    `data:image/svg+xml,${encodeURIComponent(svg)}`,
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
  ])("adapts embedded monochrome SVGs to both themes", (icon) => {
    const source = dashboardIconSource(icon) as { light: string; dark: string };
    expect(decodeURIComponent(source.light)).toContain('fill="#222326"');
    expect(decodeURIComponent(source.dark)).toContain('fill="#ffffff"');
  });

  it("preserves brand colors and image URLs", () => {
    const brand = `data:image/svg+xml,${encodeURIComponent(svg.replace("currentColor", "#ff6600"))}`;
    expect(dashboardIconSource(brand)).toBe(brand);
    expect(dashboardIconSource("https://example.com/brand.png")).toBe("https://example.com/brand.png");
    expect(dashboardIconSource("data:image/png;base64,aW1hZ2U=")).toBe("data:image/png;base64,aW1hZ2U=");
  });

  it.each([
    ["dashboard-3-line", "ri/dashboard-3-line"],
    ["cloud.sun", "ri/sun-cloudy-line"],
    ["mdi:github", "mdi/github"],
    ["iconify:simple-icons:openai", "simple-icons/openai"],
  ])("resolves the dashboard's named icon %s", (icon, path) => {
    expect(dashboardIconSource(icon)).toEqual({
      light: `https://api.iconify.design/${path}.svg?color=%23222326`,
      dark: `https://api.iconify.design/${path}.svg?color=%23ffffff`,
    });
  });

  it.each([
    undefined,
    "",
    " ",
    "unknown",
    "../icon.svg",
    "data:image/svg+xml",
    "data:image/svg+xml,%zz",
    "data:image/svg+xml;base64,bm90LXN2Zw==",
  ])("falls back for missing or unsupported icons without blocking the list", (icon) =>
    expect(dashboardIconSource(icon)).toBeUndefined(),
  );
});
