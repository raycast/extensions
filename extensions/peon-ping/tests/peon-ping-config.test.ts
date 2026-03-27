import { expect, test } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPeonPingStatus } from "../src/lib/peon-ping-config";
import { resolvePeonPingPaths } from "../src/lib/peon-ping-paths";
import { createClaudeConfigFixture } from "./helpers/claude-config-fixture";

test("resolvePeonPingPaths prefers Raycast preference over env and home default", () => {
  const homeDir = mkdtempSync(join(tmpdir(), "peon-ping-home-"));
  const envDir = mkdtempSync(join(tmpdir(), "peon-ping-env-"));
  const preferenceDir = mkdtempSync(join(tmpdir(), "peon-ping-pref-"));

  const withPreference = resolvePeonPingPaths({
    homeDir,
    claudeConfigDirEnv: envDir,
    raycastClaudeConfigDir: preferenceDir,
  });
  expect(withPreference.claudeConfigDir).toBe(preferenceDir);
  expect(withPreference.configFilePath).toBe(
    join(preferenceDir, "hooks/peon-ping/config.json"),
  );
  expect(withPreference.pausedFilePath).toBe(
    join(preferenceDir, "hooks/peon-ping/.paused"),
  );
  expect(withPreference.scriptPath).toBe(
    join(preferenceDir, "hooks/peon-ping/peon.sh"),
  );

  const envWins = resolvePeonPingPaths({
    homeDir,
    claudeConfigDirEnv: envDir,
    raycastClaudeConfigDir: undefined,
  });
  expect(envWins.claudeConfigDir).toBe(envDir);

  const homeDefault = resolvePeonPingPaths({
    homeDir,
    claudeConfigDirEnv: undefined,
    raycastClaudeConfigDir: undefined,
  });
  expect(homeDefault.claudeConfigDir).toBe(join(homeDir, ".claude"));
  expect(homeDefault.configFilePath).toBe(
    join(homeDir, ".claude", "hooks/peon-ping/config.json"),
  );
  expect(homeDefault.pausedFilePath).toBe(
    join(homeDir, ".claude", "hooks/peon-ping/.paused"),
  );
  expect(homeDefault.scriptPath).toBe(
    join(homeDir, ".claude", "hooks/peon-ping/peon.sh"),
  );
});

test("getPeonPingStatus reads enabled false from config JSON", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: false });
  expect(
    getPeonPingStatus(fx.configFilePath, fx.pausedFilePath),
  ).toEqual({ enabled: false });
});

test("getPeonPingStatus is effectively enabled when config enabled and not paused", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true });
  expect(
    getPeonPingStatus(fx.configFilePath, fx.pausedFilePath),
  ).toEqual({ enabled: true });
});

test("getPeonPingStatus is effectively disabled when paused file exists", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true });
  fx.touchPaused();
  expect(
    getPeonPingStatus(fx.configFilePath, fx.pausedFilePath),
  ).toEqual({ enabled: false });
});

test("getPeonPingStatus throws when enabled is missing", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({});
  expect(() =>
    getPeonPingStatus(fx.configFilePath, fx.pausedFilePath),
  ).toThrow("peon-ping config is missing boolean enabled");
});
