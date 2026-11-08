import { describe, expect, it } from "vitest";
import { parseSnapshot } from "../../src/lib/snapshot";
import { mergeUsage, parseUsageCli, tightestWindow } from "../../src/lib/usage";
import snapshot from "../fixtures/widget-snapshot.json";
import cliFixture from "../fixtures/usage-cli.json";

describe("parseUsageCli", () => {
  const [codex, claude, gemini] = parseUsageCli(cliFixture);

  it("titles windows by length rather than by the CLI label", () => {
    expect(codex.windows.map((w) => [w.title, w.usedPercent])).toEqual([["Monthly", 5]]);
  });

  it("includes extra windows and the plan", () => {
    expect(claude.plan).toBe("Max");
    expect(codex.plan).toBe("Free");
    expect(claude.windows.map((w) => w.id)).toEqual(["secondary", "claude-weekly-scoped-model"]);
  });

  it("keeps provider errors without windows", () => {
    expect(gemini).toMatchObject({
      provider: "gemini",
      name: "Gemini",
      error: "Not logged in to Gemini.",
      windows: [],
    });
  });

  it("never exposes the account email", () => {
    expect(JSON.stringify(parseUsageCli(cliFixture))).not.toContain("@example.com");
  });

  it("rejects non-array output", () => {
    expect(() => parseUsageCli({ error: "boom" })).toThrow();
  });
});

describe("mergeUsage", () => {
  const app = parseSnapshot(snapshot);
  const cli = parseUsageCli(cliFixture);
  const merged = mergeUsage(app, cli);

  it("prefers the newer reading per provider", () => {
    // codex CLI (19:30) is newer than the snapshot (19:00); claude CLI (18:00) is older
    expect(merged.find((u) => u.provider === "codex")).toMatchObject({ source: "cli", plan: "Free" });
    const claude = merged.find((u) => u.provider === "claude")!;
    expect(claude.source).toBe("app");
    expect(claude.windows[1].usedPercent).toBe(2);
  });

  it("borrows the plan from the CLI and costs from the app", () => {
    expect(merged.find((u) => u.provider === "claude")).toMatchObject({ plan: "Max", todayCost: 4.25 });
  });

  it("appends providers known only to the CLI, errors included", () => {
    expect(merged.map((u) => u.provider)).toEqual(["codex", "claude", "gemini"]);
    expect(merged[2].error).toBeDefined();
  });

  it("works with either side empty", () => {
    expect(mergeUsage(app, [])).toEqual(app);
    expect(mergeUsage([], cli)).toEqual(cli);
  });
});

describe("tightestWindow", () => {
  it("picks the most consumed window", () => {
    const [, claude] = parseSnapshot(snapshot);
    expect(tightestWindow(claude)?.title).toBe("5-Hour Session");
    expect(tightestWindow({ ...claude, windows: [] })).toBeUndefined();
  });
});
