import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { browseCardSvg, leaderboardTileSvg, modelCardSvg, monogramSvg } from "../src/lib/cards";
import { configurationLabel, distinctModelRankings, familyName } from "../src/lib/families";
import { rankModels } from "../src/lib/models";
import { providerAsset, providerInitials } from "../src/lib/providers";
import { model } from "./fixtures";

describe("distinct model dashboard", () => {
  it.each([
    ["Claude Opus 5.5 (Max, Default Fallback)", "Claude Opus 5.5"],
    ["Claude Opus 5.5 (High) (No Fallback)", "Claude Opus 5.5"],
    ["Qwen 235B A22B (Thinking)", "Qwen 235B A22B"],
    ["Model (Reasoning Effort: High)", "Model"],
    ["DeepSeek V3.2 (Speciale)", "DeepSeek V3.2 (Speciale)"],
    ["Model 2026-10 (22B)", "Model 2026-10 (22B)"],
    ["Model (128K Context)", "Model (128K Context)"],
  ])("normalizes %s without removing model identity", (name, expected) => {
    expect(familyName(name)).toBe(expected);
  });

  it.each([
    ["Claude Opus 5.5 (Max, Default Fallback)", "Max · Default Fallback"],
    ["Claude Opus 5.5 (High) (No Fallback)", "High · No Fallback"],
    ["Model (Reasoning Effort: High)", "Reasoning Effort: High"],
    ["DeepSeek V3.2 (Speciale)", ""],
    ["Kimi K3 Thinking", ""],
  ])("labels the configuration of %s", (name, expected) => {
    expect(configurationLabel(name)).toBe(expected);
  });

  it("chooses each family's best configuration without merging providers or versions", () => {
    const entries = distinctModelRankings([
      model({ id: "a-low", name: "Alpha (Low)", intelligence: 10 }),
      model({ id: "a-high", name: "Alpha (High)", intelligence: 80 }),
      model({ id: "a-other", name: "Alpha (High)", creatorId: "other-lab", intelligence: 60 }),
      model({ id: "a-v2", name: "Alpha 2 (High)", intelligence: 70 }),
      ...Array.from({ length: 5 }, (_, index) =>
        model({ id: `rest-${index}`, name: `Other ${index}`, intelligence: 50 - index }),
      ),
    ]);
    expect(entries.slice(0, 5).map(({ id }) => id)).toEqual(["a-high", "a-v2", "a-other", "rest-0", "rest-1"]);
    expect(entries).toHaveLength(8);
    expect(entries.map(({ rank }) => rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("card assets", () => {
  it("creates readable light/dark SVGs and escapes API text", () => {
    const entry = rankModels([model({ name: 'Example <script> & "Lab" (High)' })])[0];
    const logo =
      '<svg width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M1 1h20v20H1z"/></svg>';
    const score = { value: "50.0", label: "Intelligence <Index>" };
    const dark = modelCardSvg(entry, "dark", logo, score);
    const light = modelCardSvg(entry, "light", logo, score);
    expect(dark).toContain("&lt;script&gt;");
    expect(dark).not.toContain("<script>");
    expect(dark).toContain('font-size="54"');
    expect(dark).toContain(">50.0</text>");
    expect(dark).toContain(">Intelligence &lt;Index&gt;</text>");
    expect(dark).not.toContain('width="1em"');
    expect(light).not.toBe(dark);
    expect(browseCardSvg(694, "dark")).toContain("All 694 models");
  });

  it("draws small leaderboard tiles as a large colored icon", () => {
    const tile = leaderboardTileSvg("speed", "dark");
    expect(tile).toContain('stroke="#fb923c"');
    expect(tile).toContain('width="200" height="200" viewBox="0 0 24 24"');
    expect(tile).not.toContain("<text");
    expect(leaderboardTileSvg("favorites", "light")).toContain('fill="#ca8a04"');
  });

  it("marks the podium with medal-colored rank pills", () => {
    const logo = '<svg viewBox="0 0 24 24"></svg>';
    const score = { value: "1", label: "Score" };
    const [first, second, third, fourth] = rankModels(
      [90, 80, 70, 60].map((intelligence, index) => model({ id: `m${index}`, intelligence })),
    ).map((entry) => modelCardSvg(entry, "light", logo, score));
    expect(first).toContain('fill="#fef3c7"');
    expect(second).toContain('fill="#e2e8f0"');
    expect(third).toContain('fill="#ffedd5"');
    expect(fourth).toContain('rx="15" fill="none" stroke=');
    expect(fourth).toContain(">#4</text>");
  });

  it.each([
    "OpenAI",
    "Anthropic",
    "Google",
    "Meta",
    "SpaceXAI",
    "DeepSeek",
    "Alibaba",
    "Kimi",
    "Mistral",
    "NVIDIA",
    "Amazon",
    "Microsoft Azure",
    "Perplexity AI",
  ])("bundles a logo for %s", (creator) => {
    const asset = providerAsset(creator);
    expect(asset).toBeDefined();
    expect(existsSync(path.join(process.cwd(), "assets", asset!))).toBe(true);
  });

  it("falls back to initials for unknown providers", () => {
    expect(providerAsset("New Lab")).toBeUndefined();
    expect(providerInitials("New Lab")).toBe("NL");
    expect(monogramSvg("New Lab", "dark")).toContain(">NL</text>");
  });
});
