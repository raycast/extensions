import { expect, test } from "vitest";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getInstalledPacks } from "../src/lib/peon-ping-packs";
import { createClaudeConfigFixture } from "./helpers/claude-config-fixture";

test("getInstalledPacks reads pack names and display names from manifests", () => {
  const fx = createClaudeConfigFixture();
  fx.createPackFixture("glados", { displayName: "GLaDOS (Portal)" });
  fx.createPackFixture("peon", { displayName: "Peon (Warcraft III)" });

  expect(getInstalledPacks(fx.packsDir)).toEqual([
    { name: "glados", displayName: "GLaDOS (Portal)" },
    { name: "peon", displayName: "Peon (Warcraft III)" },
  ]);
});

test("getInstalledPacks returns empty array when packs dir does not exist", () => {
  const missingDir = join(
    mkdtempSync(join(tmpdir(), "peon-ping-missing-packs-")),
    "packs",
  );

  expect(getInstalledPacks(missingDir)).toEqual([]);
});

test("getInstalledPacks skips dirs without manifest files", () => {
  const fx = createClaudeConfigFixture();
  mkdirSync(join(fx.packsDir, "broken-pack"), { recursive: true });

  expect(getInstalledPacks(fx.packsDir)).toEqual([]);
});

test("getInstalledPacks reads manifest.json as fallback when openpeon.json is absent", () => {
  const fx = createClaudeConfigFixture();
  fx.createPackFixture("oracle", {
    displayName: "Oracle",
    manifestFileName: "manifest.json",
  });

  expect(getInstalledPacks(fx.packsDir)).toEqual([
    { name: "oracle", displayName: "Oracle" },
  ]);
});

test("getInstalledPacks uses directory name as displayName when display_name is missing", () => {
  const fx = createClaudeConfigFixture();
  fx.createPackFixture("nameless", {
    manifest: { name: "nameless" },
  });

  expect(getInstalledPacks(fx.packsDir)).toEqual([
    { name: "nameless", displayName: "nameless" },
  ]);
});
