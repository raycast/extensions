import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyFile, mkdir, rm, utimes } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({})),
}));
vi.mock("@raycast/utils", () => ({
  executeSQL: vi.fn(),
}));

import { scanRecentRollouts } from "../src/lib/rollout-fallback";

const fixtureDir = fileURLToPath(new URL("./fixtures", import.meta.url));
const fixtureNames = [
  "rollout-user-japanese.jsonl",
  "rollout-exec.jsonl",
  "rollout-json-source.jsonl",
  "rollout-subagent.jsonl",
];

let codexHome: string;
let previousCodexHome: string | undefined;

beforeEach(async () => {
  previousCodexHome = process.env.CODEX_HOME;
  codexHome = join(tmpdir(), `codex-rollouts-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(codexHome, { recursive: true });
});

afterEach(async () => {
  if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
  else process.env.CODEX_HOME = previousCodexHome;
  await rm(codexHome, { recursive: true, force: true });
});

async function installFixtures(): Promise<string> {
  const target = join(codexHome, "sessions", "2026", "07", "14");
  await mkdir(target, { recursive: true });
  for (const name of fixtureNames) await copyFile(join(fixtureDir, name), join(target, name));
  process.env.CODEX_HOME = codexHome;
  return target;
}

describe("scanRecentRollouts", () => {
  it("uses the first real user_message event, not injected user-role context", async () => {
    const target = await installFixtures();
    const timestamp = new Date("2026-07-14T12:34:56.789Z");
    await utimes(join(target, "rollout-user-japanese.jsonl"), timestamp, timestamp);

    const rows = await scanRecentRollouts();

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("thread-japanese-1");
    expect(rows[0].first_user_message).toBe("本当のユーザー依頼: 日本語のセッションを開いてください");
    expect(rows[0].preview).toBe(rows[0].first_user_message);
    expect(rows[0].first_user_message).not.toContain("Injected environment context");
  });

  it("derives updated_at from file mtime and orders newest first", async () => {
    const target = await installFixtures();
    const newest = new Date("2026-07-14T12:34:56.789Z");
    await utimes(join(target, "rollout-user-japanese.jsonl"), newest, newest);

    const rows = await scanRecentRollouts();

    expect(rows[0].updated_at).toBe(newest.getTime());
    expect(rows[0].updated_at).not.toBe(Date.parse("2026-07-14T12:00:00.000Z"));
  });

  it("matches the SQL interactive source and thread-source exclusions", async () => {
    await installFixtures();

    const rows = await scanRecentRollouts();

    expect(rows.map((row) => row.id)).toEqual(["thread-japanese-1"]);
    expect(
      rows.every((row) => row.source !== "exec" && !row.source.startsWith("{") && row.thread_source !== "subagent"),
    ).toBe(true);
  });

  it("returns no rows when the sessions directory is absent", async () => {
    process.env.CODEX_HOME = codexHome;

    await expect(scanRecentRollouts()).resolves.toEqual([]);
  });
});
