import { expect, test } from "vitest";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getPeonPingConfig,
  getPeonPingStatus,
} from "../src/lib/peon-ping-config";
import { resolvePeonPingPaths } from "../src/lib/peon-ping-paths";
import { createClaudeConfigFixture } from "./helpers/claude-config-fixture";

const defaultCategories = {
  "session.start": true,
  "task.acknowledge": false,
  "task.complete": true,
  "task.error": true,
  "input.required": true,
  "resource.limit": true,
  "user.spam": true,
} as const;

const defaultAdvancedConfig = {
  packRotation: [],
  pathRules: [],
  useSoundEffectsDevice: false,
  silentWindowSeconds: 0,
  sessionStartCooldownSeconds: 30,
  suppressSubagentComplete: false,
  meetingDetect: false,
  notificationAllScreens: true,
  notificationTitleOverride: "",
  notificationTemplates: {},
  debugEnabled: false,
  debugRetentionDays: 7,
  trainer: {
    enabled: false,
    exercises: { pushups: 300, squats: 300 },
    reminderIntervalMinutes: 20,
    reminderMinGapMinutes: 5,
  },
} as const;

test("resolvePeonPingPaths prefers Raycast preference over env and home default", () => {
  const homeDir = mkdtempSync(join(tmpdir(), "peon-ping-home-"));
  const envDir = mkdtempSync(join(tmpdir(), "peon-ping-env-"));
  const preferenceDir = mkdtempSync(join(tmpdir(), "peon-ping-pref-"));
  mkdirSync(join(preferenceDir, "hooks/peon-ping/packs"), { recursive: true });
  mkdirSync(join(envDir, "hooks/peon-ping/packs"), { recursive: true });

  const withPreference = resolvePeonPingPaths({
    homeDir,
    claudeConfigDirEnv: envDir,
    raycastClaudeConfigDir: preferenceDir,
  });
  expect(withPreference.claudeConfigDir).toBe(preferenceDir);
  expect(withPreference.installDir).toBe(
    join(preferenceDir, "hooks/peon-ping"),
  );
  expect(withPreference.peonDir).toBe(
    join(preferenceDir, "hooks/peon-ping"),
  );
  expect(withPreference.packsDir).toBe(
    join(preferenceDir, "hooks/peon-ping/packs"),
  );
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
  expect(envWins.installDir).toBe(join(envDir, "hooks/peon-ping"));
  expect(envWins.peonDir).toBe(join(envDir, "hooks/peon-ping"));
  expect(envWins.packsDir).toBe(join(envDir, "hooks/peon-ping/packs"));

  const homeDefault = resolvePeonPingPaths({
    homeDir,
    claudeConfigDirEnv: undefined,
    raycastClaudeConfigDir: undefined,
  });
  expect(homeDefault.claudeConfigDir).toBe(join(homeDir, ".claude"));
  expect(homeDefault.installDir).toBe(join(homeDir, ".claude", "hooks/peon-ping"));
  expect(homeDefault.peonDir).toBe(join(homeDir, ".openpeon"));
  expect(homeDefault.packsDir).toBe(join(homeDefault.peonDir, "packs"));
  expect(homeDefault.configFilePath).toBe(
    join(homeDir, ".openpeon", "config.json"),
  );
  expect(homeDefault.pausedFilePath).toBe(
    join(homeDir, ".openpeon", ".paused"),
  );
  expect(homeDefault.scriptPath).toBe(
    join(homeDir, ".claude", "hooks/peon-ping/peon.sh"),
  );
});

test("resolvePeonPingPaths uses CLAUDE_PEON_DIR when install dir has packs", () => {
  const homeDir = mkdtempSync(join(tmpdir(), "peon-ping-home-"));
  const installDir = mkdtempSync(join(tmpdir(), "peon-ping-install-"));
  mkdirSync(join(installDir, "packs"), { recursive: true });

  const paths = resolvePeonPingPaths({
    homeDir,
    raycastClaudeConfigDir: undefined,
    claudeConfigDirEnv: undefined,
    claudePeonDirEnv: installDir,
  } as Parameters<typeof resolvePeonPingPaths>[0] & {
    claudePeonDirEnv: string;
  });

  expect(paths.installDir).toBe(installDir);
  expect(paths.peonDir).toBe(installDir);
  expect(paths.packsDir).toBe(join(installDir, "packs"));
  expect(paths.scriptPath).toBe(join(installDir, "peon.sh"));
  expect(paths.configFilePath).toBe(join(installDir, "config.json"));
  expect(paths.pausedFilePath).toBe(join(installDir, ".paused"));
});

test("resolvePeonPingPaths uses hook dir data when CLAUDE_PEON_DIR install has no packs", () => {
  const homeDir = mkdtempSync(join(tmpdir(), "peon-ping-home-"));
  const claudeConfigDir = mkdtempSync(join(tmpdir(), "peon-ping-claude-"));
  const installDir = mkdtempSync(join(tmpdir(), "peon-ping-install-"));
  const hookDir = join(claudeConfigDir, "hooks/peon-ping");
  mkdirSync(join(hookDir, "packs"), { recursive: true });

  const paths = resolvePeonPingPaths({
    homeDir,
    raycastClaudeConfigDir: claudeConfigDir,
    claudeConfigDirEnv: undefined,
    claudePeonDirEnv: installDir,
  } as Parameters<typeof resolvePeonPingPaths>[0] & {
    claudePeonDirEnv: string;
  });

  expect(paths.installDir).toBe(installDir);
  expect(paths.peonDir).toBe(hookDir);
  expect(paths.packsDir).toBe(join(hookDir, "packs"));
  expect(paths.scriptPath).toBe(join(installDir, "peon.sh"));
  expect(paths.configFilePath).toBe(join(hookDir, "config.json"));
  expect(paths.pausedFilePath).toBe(join(hookDir, ".paused"));
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

test("getPeonPingConfig reads all Tier 1 fields from config.json", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    volume: 0.75,
    default_pack: "glados",
    desktop_notifications: false,
    headphones_only: true,
  });

  expect(getPeonPingConfig(fx.configFilePath, fx.pausedFilePath)).toEqual({
    effectivelyEnabled: true,
    volume: 0.75,
    activePack: "glados",
    desktopNotifications: false,
    headphonesOnly: true,
    packRotationMode: "random",
    categories: defaultCategories,
    notificationStyle: "overlay",
    notificationPosition: "top-center",
    notificationDismissSeconds: 4,
    mobileNotifyEnabled: false,
    mobileNotifyConfigured: false,
    ...defaultAdvancedConfig,
  });
});

test("getPeonPingConfig reads all Tier 2 fields from config.json", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    volume: 0.5,
    default_pack: "peon",
    desktop_notifications: true,
    headphones_only: false,
    pack_rotation_mode: "round-robin",
    categories: {
      "session.start": false,
      "task.acknowledge": true,
      "task.complete": true,
      "task.error": false,
      "input.required": true,
      "resource.limit": false,
      "user.spam": true,
    },
    notification_style: "standard",
    notification_position: "top-right",
    notification_dismiss_seconds: 8,
    mobile_notify: { enabled: true, service: "ntfy" },
  });

  expect(getPeonPingConfig(fx.configFilePath, fx.pausedFilePath)).toEqual({
    effectivelyEnabled: true,
    volume: 0.5,
    activePack: "peon",
    desktopNotifications: true,
    headphonesOnly: false,
    packRotationMode: "round-robin",
    categories: {
      "session.start": false,
      "task.acknowledge": true,
      "task.complete": true,
      "task.error": false,
      "input.required": true,
      "resource.limit": false,
      "user.spam": true,
    },
    notificationStyle: "standard",
    notificationPosition: "top-right",
    notificationDismissSeconds: 8,
    mobileNotifyEnabled: true,
    mobileNotifyConfigured: true,
    ...defaultAdvancedConfig,
  });
});

test("getPeonPingConfig reads advanced parity fields from config.json", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    pack_rotation: ["peon", "glados"],
    path_rules: [
      { pattern: "*/client-a/*", pack: "glados" },
      { pattern: "*/personal/*", pack: "peon" },
    ],
    use_sound_effects_device: true,
    silent_window_seconds: 12,
    session_start_cooldown_seconds: 45,
    suppress_subagent_complete: true,
    meeting_detect: true,
    notification_all_screens: false,
    notification_title_override: "Client A",
    notification_templates: {
      stop: "{project}: done",
      permission: "{project}: needs approval",
    },
    debug: true,
    debug_retention_days: 30,
    trainer: {
      enabled: true,
      exercises: { pushups: 100, squats: 120 },
      reminder_interval_minutes: 30,
      reminder_min_gap_minutes: 10,
    },
  });

  expect(getPeonPingConfig(fx.configFilePath, fx.pausedFilePath)).toMatchObject({
    packRotation: ["peon", "glados"],
    pathRules: [
      { pattern: "*/client-a/*", pack: "glados" },
      { pattern: "*/personal/*", pack: "peon" },
    ],
    useSoundEffectsDevice: true,
    silentWindowSeconds: 12,
    sessionStartCooldownSeconds: 45,
    suppressSubagentComplete: true,
    meetingDetect: true,
    notificationAllScreens: false,
    notificationTitleOverride: "Client A",
    notificationTemplates: {
      stop: "{project}: done",
      permission: "{project}: needs approval",
    },
    debugEnabled: true,
    debugRetentionDays: 30,
    trainer: {
      enabled: true,
      exercises: { pushups: 100, squats: 120 },
      reminderIntervalMinutes: 30,
      reminderMinGapMinutes: 10,
    },
  });
});

test("getPeonPingConfig falls back to active_pack when default_pack is absent", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    volume: 0.5,
    active_pack: "peon",
  });

  expect(getPeonPingConfig(fx.configFilePath, fx.pausedFilePath)).toMatchObject({
    activePack: "peon",
  });
});

test("getPeonPingConfig uses defaults for optional fields", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true });

  expect(getPeonPingConfig(fx.configFilePath, fx.pausedFilePath)).toEqual({
    effectivelyEnabled: true,
    volume: 0.5,
    activePack: "peon",
    desktopNotifications: true,
    headphonesOnly: false,
    packRotationMode: "random",
    categories: defaultCategories,
    notificationStyle: "overlay",
    notificationPosition: "top-center",
    notificationDismissSeconds: 4,
    mobileNotifyEnabled: false,
    mobileNotifyConfigured: false,
    ...defaultAdvancedConfig,
  });
});

test("getPeonPingConfig reflects paused state in effectivelyEnabled", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, volume: 0.5 });
  fx.touchPaused();

  expect(getPeonPingConfig(fx.configFilePath, fx.pausedFilePath)).toMatchObject({
    effectivelyEnabled: false,
  });
});

test("getPeonPingConfig reports mobileNotifyConfigured false when mobile_notify has no service", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, mobile_notify: {} });

  expect(getPeonPingConfig(fx.configFilePath, fx.pausedFilePath)).toMatchObject({
    mobileNotifyConfigured: false,
    mobileNotifyEnabled: false,
  });
});

test("getPeonPingConfig reports mobileNotifyEnabled false when service exists but enabled is false", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    mobile_notify: { service: "ntfy", enabled: false },
  });

  expect(getPeonPingConfig(fx.configFilePath, fx.pausedFilePath)).toMatchObject({
    mobileNotifyConfigured: true,
    mobileNotifyEnabled: false,
  });
});
