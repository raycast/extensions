import { expect, test, vi } from "vitest";
import type { PeonPingConfig, PeonPingStatus } from "../src/lib/peon-ping-config";
import type { PeonPingResolvedPaths } from "../src/lib/peon-ping-paths";
import type { PeonPingCommandRunner } from "../src/lib/peon-ping-service";
import {
  runMenuBarNextPackAction,
  runMenuBarSetActivePackAction,
  runMenuBarSetDismissTimeAction,
  runMenuBarSetNotificationPositionAction,
  runMenuBarSetNotificationStyleAction,
  runMenuBarSetRotationModeAction,
  runMenuBarSetVolumeAction,
  runMenuBarToggleAction,
  runMenuBarToggleCategoryAction,
  runMenuBarToggleHeadphonesOnlyAction,
  runMenuBarToggleMobileAction,
  runMenuBarToggleNotificationsAction,
} from "../src/peon-ping-menu-bar";

const dummyPaths: PeonPingResolvedPaths = {
  claudeConfigDir: "/tmp/claude",
  installDir: "/tmp/claude/hooks/peon-ping",
  peonDir: "/tmp/claude/hooks/peon-ping",
  packsDir: "/tmp/claude/hooks/peon-ping/packs",
  configFilePath: "/tmp/claude/hooks/peon-ping/config.json",
  pausedFilePath: "/tmp/claude/hooks/peon-ping/.paused",
  scriptPath: "/tmp/claude/hooks/peon-ping/peon.sh",
};

function makeConfig(overrides: Partial<PeonPingConfig> = {}): PeonPingConfig {
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
    ...overrides,
  };
}

test("runMenuBarToggleAction updates local status from the toggle result", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const status: PeonPingStatus = { enabled: false };
  const togglePeonPing = vi.fn(() => ({
    message: "peon-ping: sounds paused (run 'peon toggle' to unpause)",
    status,
  }));
  const setStatus = vi.fn();

  const result = runMenuBarToggleAction({
    paths: dummyPaths,
    run,
    togglePeonPing,
    setStatus,
  });

  expect(togglePeonPing).toHaveBeenCalledWith(dummyPaths, run);
  expect(setStatus).toHaveBeenCalledWith(status);
  expect(result).toEqual({
    message: "peon-ping: sounds paused (run 'peon toggle' to unpause)",
    status,
  });
});

test("runMenuBarSetVolumeAction calls setVolume and updates config state", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const config = makeConfig({ volume: 0.75 });
  const setVolume = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarSetVolumeAction(
    { paths: dummyPaths, run, setVolume, setConfig },
    0.75,
  );

  expect(setVolume).toHaveBeenCalledWith(dummyPaths, run, 0.75);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarSetActivePackAction calls setActivePack and updates config state", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const config = makeConfig({ activePack: "glados" });
  const setActivePack = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarSetActivePackAction(
    { paths: dummyPaths, run, setActivePack, setConfig },
    "glados",
  );

  expect(setActivePack).toHaveBeenCalledWith(dummyPaths, run, "glados");
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarNextPackAction calls advanceToNextPack and updates config state", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const config = makeConfig({ activePack: "glados" });
  const advanceToNextPack = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarNextPackAction({
    paths: dummyPaths,
    run,
    advanceToNextPack,
    setConfig,
  });

  expect(advanceToNextPack).toHaveBeenCalledWith(dummyPaths, run);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarToggleNotificationsAction calls setDesktopNotifications and updates config state", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const config = makeConfig({ desktopNotifications: false });
  const setDesktopNotifications = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarToggleNotificationsAction(
    { paths: dummyPaths, run, setDesktopNotifications, setConfig },
    false,
  );

  expect(setDesktopNotifications).toHaveBeenCalledWith(dummyPaths, run, false);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarToggleHeadphonesOnlyAction calls setHeadphonesOnly and updates config state", () => {
  const config = makeConfig({ headphonesOnly: true });
  const setHeadphonesOnly = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarToggleHeadphonesOnlyAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setHeadphonesOnly,
      setConfig,
    },
    true,
  );

  expect(setHeadphonesOnly).toHaveBeenCalledWith(
    dummyPaths.configFilePath,
    dummyPaths.pausedFilePath,
    true,
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarSetRotationModeAction calls setPackRotationMode and updates config state", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const config = makeConfig({ packRotationMode: "round-robin" });
  const setPackRotationMode = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarSetRotationModeAction(
    { paths: dummyPaths, run, setPackRotationMode, setConfig },
    "round-robin",
  );

  expect(setPackRotationMode).toHaveBeenCalledWith(
    dummyPaths,
    run,
    "round-robin",
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarToggleCategoryAction calls setCategoryEnabled and updates config state", () => {
  const config = makeConfig({
    categories: {
      ...makeConfig().categories,
      "task.complete": false,
    },
  });
  const setCategoryEnabled = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarToggleCategoryAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setCategoryEnabled,
      setConfig,
    },
    "task.complete",
    false,
  );

  expect(setCategoryEnabled).toHaveBeenCalledWith(
    dummyPaths.configFilePath,
    dummyPaths.pausedFilePath,
    "task.complete",
    false,
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarSetNotificationStyleAction calls setNotificationStyle and updates config state", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const config = makeConfig({ notificationStyle: "standard" });
  const setNotificationStyle = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarSetNotificationStyleAction(
    { paths: dummyPaths, run, setNotificationStyle, setConfig },
    "standard",
  );

  expect(setNotificationStyle).toHaveBeenCalledWith(
    dummyPaths,
    run,
    "standard",
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarSetNotificationPositionAction calls setNotificationPosition and updates config state", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const config = makeConfig({ notificationPosition: "top-right" });
  const setNotificationPosition = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarSetNotificationPositionAction(
    { paths: dummyPaths, run, setNotificationPosition, setConfig },
    "top-right",
  );

  expect(setNotificationPosition).toHaveBeenCalledWith(
    dummyPaths,
    run,
    "top-right",
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarSetDismissTimeAction calls setNotificationDismissTime and updates config state", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const config = makeConfig({ notificationDismissSeconds: 8 });
  const setNotificationDismissTime = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarSetDismissTimeAction(
    { paths: dummyPaths, run, setNotificationDismissTime, setConfig },
    8,
  );

  expect(setNotificationDismissTime).toHaveBeenCalledWith(dummyPaths, run, 8);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runMenuBarToggleMobileAction calls setMobileNotifications and updates config state", () => {
  const run = vi.fn() as unknown as PeonPingCommandRunner;
  const config = makeConfig({
    mobileNotifyEnabled: true,
    mobileNotifyConfigured: true,
  });
  const setMobileNotifications = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runMenuBarToggleMobileAction(
    { paths: dummyPaths, run, setMobileNotifications, setConfig },
    true,
  );

  expect(setMobileNotifications).toHaveBeenCalledWith(dummyPaths, run, true);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});
