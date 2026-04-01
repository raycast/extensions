import { existsSync, writeFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  getPeonPingStatus,
  type PeonPingConfig,
} from "../src/lib/peon-ping-config";
import { resolvePeonPingPaths } from "../src/lib/peon-ping-paths";
import {
  addPackToRotation,
  advanceToNextPack,
  clearPackRotation,
  removePackFromRotation,
  setActivePack,
  setCategoryEnabled,
  setDesktopNotifications,
  setHeadphonesOnly,
  setMobileNotifications,
  setNotificationDismissTime,
  setNotificationPosition,
  setNotificationStyle,
  setPackRotationMode,
  setVolume,
  togglePeonPing,
  type PeonPingCommandRunner,
} from "../src/lib/peon-ping-service";
import { resolvePeonPingCommandTarget } from "../src/lib/peon-ping-command-target";
import { createClaudeConfigFixture } from "./helpers/claude-config-fixture";

function expectedConfig(overrides: Partial<PeonPingConfig> = {}): PeonPingConfig {
  return {
    effectivelyEnabled: true,
    volume: 0.5,
    activePack: "peon",
    desktopNotifications: true,
    headphonesOnly: false,
    packRotationMode: "random",
    categories: {
      "session.start": true,
      "task.acknowledge": false,
      "task.complete": true,
      "task.error": true,
      "input.required": true,
      "resource.limit": true,
      "user.spam": true,
    },
    notificationStyle: "overlay",
    notificationPosition: "top-center",
    notificationDismissSeconds: 4,
    mobileNotifyEnabled: false,
    mobileNotifyConfigured: false,
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
    ...overrides,
  };
}

test("togglePeonPing runs bash scriptPath toggle and returns message and refreshed status", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });
  writeFileSync(paths.scriptPath, "");
  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "toggle"]);
    if (existsSync(fx.pausedFilePath)) {
      fx.removePaused();
      return "peon-ping: sounds resumed\n";
    }
    fx.touchPaused();
    return "peon-ping: sounds paused (run 'peon toggle' to unpause)\n";
  };
  const result = togglePeonPing(paths, run);
  expect(result.message).toBe(
    "peon-ping: sounds paused (run 'peon toggle' to unpause)",
  );
  expect(result.status).toEqual(
    getPeonPingStatus(paths.configFilePath, paths.pausedFilePath),
  );
  expect(result.status.enabled).toBe(false);
});

test("togglePeonPing wraps missing script with install hint", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });
  expect(() =>
    togglePeonPing(paths, () => {
      throw new Error("run should not be invoked");
    }),
  ).toThrow(`peon-ping is not installed at ${paths.scriptPath}`);
});

test("setVolume calls peon.sh volume <n> and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, volume: 0.5 });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "volume", "0.75"]);
    fx.writeConfigJson({ enabled: true, volume: 0.75 });
    return "";
  };

  expect(setVolume(paths, run, 0.75)).toEqual(
    expectedConfig({ volume: 0.75 }),
  );
});

test("setVolume prefers the peon CLI when available", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, volume: 0.5 });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });
  const runtimePaths = {
    ...paths,
    commandTarget: resolvePeonPingCommandTarget(paths, {
      pathEnv: "/opt/homebrew/bin:/usr/bin",
      hasExecutable: (candidate) => candidate === "/opt/homebrew/bin/peon",
    }),
  };

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("/opt/homebrew/bin/peon");
    expect(args).toEqual(["volume", "0.75"]);
    fx.writeConfigJson({ enabled: true, volume: 0.75 });
    return "";
  };

  expect(setVolume(runtimePaths, run, 0.75)).toEqual(
    expectedConfig({ volume: 0.75 }),
  );
});

test("setActivePack calls peon.sh packs use <name> and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, active_pack: "peon" });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "packs", "use", "glados"]);
    fx.writeConfigJson({ enabled: true, default_pack: "glados" });
    return "";
  };

  expect(setActivePack(paths, run, "glados")).toEqual(
    expectedConfig({ activePack: "glados" }),
  );
});

test("advanceToNextPack calls peon.sh packs next and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, default_pack: "peon" });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "packs", "next"]);
    fx.writeConfigJson({ enabled: true, default_pack: "glados" });
    return "";
  };

  expect(advanceToNextPack(paths, run)).toEqual(
    expectedConfig({ activePack: "glados" }),
  );
});

test("setDesktopNotifications calls peon.sh notifications on|off and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, desktop_notifications: true });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "notifications", "off"]);
    fx.writeConfigJson({ enabled: true, desktop_notifications: false });
    return "";
  };

  expect(setDesktopNotifications(paths, run, false)).toEqual(
    expectedConfig({ desktopNotifications: false }),
  );
});

test("setHeadphonesOnly writes headphones_only to config.json and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, volume: 0.5 });

  expect(setHeadphonesOnly(fx.configFilePath, fx.pausedFilePath, true)).toEqual(
    expectedConfig({ headphonesOnly: true }),
  );
});

test("setHeadphonesOnly preserves other config fields", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    volume: 0.75,
    desktop_notifications: false,
    categories: { "task.complete": false, "input.required": true },
  });

  const result = setHeadphonesOnly(fx.configFilePath, fx.pausedFilePath, true);

  expect(result).toMatchObject({
    volume: 0.75,
    desktopNotifications: false,
    headphonesOnly: true,
  });
});

test("setPackRotationMode calls peon.sh rotation <mode> and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, pack_rotation_mode: "random" });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "rotation", "round-robin"]);
    fx.writeConfigJson({ enabled: true, pack_rotation_mode: "round-robin" });
    return "";
  };

  expect(setPackRotationMode(paths, run, "round-robin")).toEqual(
    expectedConfig({ packRotationMode: "round-robin" }),
  );
});

test("addPackToRotation calls peon packs rotation add <name>", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, pack_rotation: ["peon"] });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });
  const runtimePaths = {
    ...paths,
    commandTarget: resolvePeonPingCommandTarget(paths, {
      pathEnv: "/opt/homebrew/bin:/usr/bin",
      hasExecutable: (candidate) => candidate === "/opt/homebrew/bin/peon",
    }),
  };

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("/opt/homebrew/bin/peon");
    expect(args).toEqual(["packs", "rotation", "add", "glados"]);
    fx.writeConfigJson({ enabled: true, pack_rotation: ["peon", "glados"] });
    return "";
  };

  expect(addPackToRotation(runtimePaths, run, "glados")).toEqual(
    expectedConfig({ packRotation: ["peon", "glados"] }),
  );
});

test("removePackFromRotation calls peon packs rotation remove <name>", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, pack_rotation: ["peon", "glados"] });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });
  const runtimePaths = {
    ...paths,
    commandTarget: resolvePeonPingCommandTarget(paths, {
      pathEnv: "/opt/homebrew/bin:/usr/bin",
      hasExecutable: (candidate) => candidate === "/opt/homebrew/bin/peon",
    }),
  };

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("/opt/homebrew/bin/peon");
    expect(args).toEqual(["packs", "rotation", "remove", "glados"]);
    fx.writeConfigJson({ enabled: true, pack_rotation: ["peon"] });
    return "";
  };

  expect(removePackFromRotation(runtimePaths, run, "glados")).toEqual(
    expectedConfig({ packRotation: ["peon"] }),
  );
});

test("clearPackRotation calls peon packs rotation clear", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, pack_rotation: ["peon", "glados"] });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });
  const runtimePaths = {
    ...paths,
    commandTarget: resolvePeonPingCommandTarget(paths, {
      pathEnv: "/opt/homebrew/bin:/usr/bin",
      hasExecutable: (candidate) => candidate === "/opt/homebrew/bin/peon",
    }),
  };

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("/opt/homebrew/bin/peon");
    expect(args).toEqual(["packs", "rotation", "clear"]);
    fx.writeConfigJson({ enabled: true, pack_rotation: [] });
    return "";
  };

  expect(clearPackRotation(runtimePaths, run)).toEqual(
    expectedConfig({ packRotation: [] }),
  );
});

test("setCategoryEnabled sets a category to true in config.json and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    categories: { "task.complete": false, "input.required": true },
  });

  expect(
    setCategoryEnabled(
      fx.configFilePath,
      fx.pausedFilePath,
      "task.complete",
      true,
    ),
  ).toMatchObject({
    categories: {
      "task.complete": true,
      "input.required": true,
    },
  });
});

test("setCategoryEnabled sets a category to false", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    categories: { "task.complete": true },
  });

  expect(
    setCategoryEnabled(
      fx.configFilePath,
      fx.pausedFilePath,
      "task.complete",
      false,
    ),
  ).toMatchObject({
    categories: {
      "task.complete": false,
    },
  });
});

test("setCategoryEnabled preserves other categories and config fields", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    volume: 0.75,
    categories: {
      "session.start": false,
      "task.complete": true,
      "input.required": true,
    },
  });

  expect(
    setCategoryEnabled(
      fx.configFilePath,
      fx.pausedFilePath,
      "task.complete",
      false,
    ),
  ).toMatchObject({
    volume: 0.75,
    categories: {
      "session.start": false,
      "task.complete": false,
      "input.required": true,
    },
  });
});

test("setCategoryEnabled creates categories object when absent", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true });

  expect(
    setCategoryEnabled(
      fx.configFilePath,
      fx.pausedFilePath,
      "session.start",
      true,
    ),
  ).toMatchObject({
    categories: {
      "session.start": true,
    },
  });
});

test("setNotificationStyle calls peon.sh notifications overlay and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, notification_style: "standard" });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "notifications", "overlay"]);
    fx.writeConfigJson({ enabled: true, notification_style: "overlay" });
    return "";
  };

  expect(setNotificationStyle(paths, run, "overlay")).toEqual(
    expectedConfig({ notificationStyle: "overlay" }),
  );
});

test("setNotificationStyle calls peon.sh notifications standard", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, notification_style: "overlay" });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "notifications", "standard"]);
    fx.writeConfigJson({ enabled: true, notification_style: "standard" });
    return "";
  };

  expect(setNotificationStyle(paths, run, "standard")).toEqual(
    expectedConfig({ notificationStyle: "standard" }),
  );
});

test("setNotificationPosition calls peon.sh notifications position <pos> and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, notification_position: "top-center" });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([
      paths.scriptPath,
      "notifications",
      "position",
      "top-right",
    ]);
    fx.writeConfigJson({ enabled: true, notification_position: "top-right" });
    return "";
  };

  expect(setNotificationPosition(paths, run, "top-right")).toEqual(
    expectedConfig({ notificationPosition: "top-right" }),
  );
});

test("setNotificationDismissTime calls peon.sh notifications dismiss <n> and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, notification_dismiss_seconds: 4 });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "notifications", "dismiss", "8"]);
    fx.writeConfigJson({ enabled: true, notification_dismiss_seconds: 8 });
    return "";
  };

  expect(setNotificationDismissTime(paths, run, 8)).toEqual(
    expectedConfig({ notificationDismissSeconds: 8 }),
  );
});

test("setNotificationDismissTime with 0 sets persistent", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({ enabled: true, notification_dismiss_seconds: 4 });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "notifications", "dismiss", "0"]);
    fx.writeConfigJson({ enabled: true, notification_dismiss_seconds: 0 });
    return "";
  };

  expect(setNotificationDismissTime(paths, run, 0)).toEqual(
    expectedConfig({ notificationDismissSeconds: 0 }),
  );
});

test("setMobileNotifications calls peon.sh mobile on and returns refreshed config", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    mobile_notify: { service: "ntfy", enabled: false, topic: "test" },
  });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "mobile", "on"]);
    fx.writeConfigJson({
      enabled: true,
      mobile_notify: { service: "ntfy", enabled: true, topic: "test" },
    });
    return "";
  };

  expect(setMobileNotifications(paths, run, true)).toEqual(
    expectedConfig({ mobileNotifyEnabled: true, mobileNotifyConfigured: true }),
  );
});

test("setMobileNotifications calls peon.sh mobile off", () => {
  const fx = createClaudeConfigFixture();
  fx.writeConfigJson({
    enabled: true,
    mobile_notify: { service: "ntfy", enabled: true, topic: "test" },
  });
  const paths = resolvePeonPingPaths({
    homeDir: "/unused",
    raycastClaudeConfigDir: fx.claudeConfigDir,
  });

  const run: PeonPingCommandRunner = (command, args) => {
    expect(command).toBe("bash");
    expect(args).toEqual([paths.scriptPath, "mobile", "off"]);
    fx.writeConfigJson({
      enabled: true,
      mobile_notify: { service: "ntfy", enabled: false, topic: "test" },
    });
    return "";
  };

  expect(setMobileNotifications(paths, run, false)).toEqual(
    expectedConfig({ mobileNotifyEnabled: false, mobileNotifyConfigured: true }),
  );
});
