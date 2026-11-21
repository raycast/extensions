import { afterAll, describe, expect, it } from "vitest";
import { groupIconFiles } from "../src/lib/icons";
import { DashboardIconsClient } from "../src/lib/mcp";

// Contract test against the real dashboardicons.com MCP server. Run with `npm run test:live`.
const live = process.env.DASHBOARD_ICONS_LIVE === "1";
const client = new DashboardIconsClient();

afterAll(() => client.close());

describe.runIf(live)("dashboardicons.com MCP server", () => {
  it("finds ntfy and offers Base as WebP, PNG and SVG", async () => {
    const results = await client.searchIcons("ntfy");
    expect(results[0]).toMatchObject({ name: "ntfy", source: "native" });

    const icon = await client.getIcon("ntfy", "native");
    if (!icon.found) throw new Error("ntfy not found");
    const groups = groupIconFiles(icon.icon);
    expect(groups[0].label).toBe("Base");
    expect(groups[0].files.map((file) => file.fileName)).toEqual(["ntfy.webp", "ntfy.png", "ntfy.svg"]);

    const response = await fetch(groups[0].files[0].url, { method: "HEAD" });
    expect(response.ok).toBe(true);
  }, 30_000);

  it("offers Base, Light and Dark for portabase", async () => {
    const icon = await client.getIcon("portabase", "native");
    if (!icon.found) throw new Error("portabase not found");
    const labels = groupIconFiles(icon.icon).map((group) => group.label);
    expect(labels.slice(0, 3)).toEqual(["Base", "Light", "Dark"]);
  }, 30_000);

  it("suggests portabase for the typo portbase", async () => {
    const found = await client.findIcons("portbase");
    expect(found.isSuggestion).toBe(true);
    expect(found.results[0]).toMatchObject({ name: "portabase" });
  }, 30_000);

  it("filters by source", async () => {
    const results = await client.searchIcons("github", { sources: ["simpleicons"], limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.source === "simpleicons")).toBe(true);
  }, 30_000);
});
