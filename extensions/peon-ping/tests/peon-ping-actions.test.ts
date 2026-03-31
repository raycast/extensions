import { expect, test, vi } from "vitest";
import { LaunchType, Toast } from "@raycast/api";
import type { PeonPingConfig, PeonPingStatus } from "../src/lib/peon-ping-config";
import type { PeonPingResolvedPaths } from "../src/lib/peon-ping-paths";
import type { PeonPingCommandRunner } from "../src/lib/peon-ping-service";
import {
  runNextPackAction,
  runSetActivePackAction,
  runSetDismissTimeAction,
  runSetNotificationPositionAction,
  runSetNotificationStyleAction,
  runSetRotationModeAction,
  runStatusToggleAndRefreshMenuBarSafely,
  runSetVolumeAction,
  runStatusToggleAndRefreshMenuBar,
  runToggleAction,
  runToggleCategoryAction,
  runToggleHeadphonesOnlyAction,
  runToggleMobileAction,
  runToggleNotificationsAction,
} from "../src/lib/peon-ping-actions";

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

function createRunStub(): { run: PeonPingCommandRunner } {
  return {
    run: vi.fn((_command: string, _args: readonly string[]): string => ""),
  };
}

test("runToggleAction updates local status from the toggle result", () => {
  const { run } = createRunStub();
  const status: PeonPingStatus = { enabled: false };
  const togglePeonPing = vi.fn(() => ({
    message: "peon-ping: sounds paused (run 'peon toggle' to unpause)",
    status,
  }));
  const setStatus = vi.fn();

  const result = runToggleAction({
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

test("runStatusToggleAndRefreshMenuBar awaits refresh and resolves when menu bar is not activated", async () => {
  const { run } = createRunStub();
  const status: PeonPingStatus = { enabled: false };
  const togglePeonPing = vi.fn(() => ({
    message: "ok",
    status,
  }));
  const setStatus = vi.fn();
  const launchCommand = vi.fn().mockRejectedValue(
    new Error(
      'Command "Peon Ping Menu Bar" must be activated before it can be run in the background',
    ),
  );

  await expect(
    runStatusToggleAndRefreshMenuBar(
      { paths: dummyPaths, run, togglePeonPing, setStatus },
      { launchCommand },
    ),
  ).resolves.toBeUndefined();

  expect(launchCommand).toHaveBeenCalledWith({
    name: "peon-ping-menu-bar",
    type: LaunchType.Background,
  });
});

test("runStatusToggleAndRefreshMenuBar propagates non-activation refresh failures", async () => {
  const { run } = createRunStub();
  const status: PeonPingStatus = { enabled: true };
  const togglePeonPing = vi.fn(() => ({ message: "ok", status }));
  const setStatus = vi.fn();
  const failure = new Error("launch failed");
  const launchCommand = vi.fn().mockRejectedValue(failure);

  await expect(
    runStatusToggleAndRefreshMenuBar(
      { paths: dummyPaths, run, togglePeonPing, setStatus },
      { launchCommand },
    ),
  ).rejects.toBe(failure);
});

test("runStatusToggleAndRefreshMenuBarSafely returns void and shows a failure toast for refresh errors", async () => {
  const { run } = createRunStub();
  const status: PeonPingStatus = { enabled: false };
  const togglePeonPing = vi.fn(() => ({ message: "ok", status }));
  const setStatus = vi.fn();
  const launchCommand = vi.fn().mockRejectedValue(new Error("launch failed"));
  const showToast = vi.fn().mockResolvedValue(undefined);

  const result = runStatusToggleAndRefreshMenuBarSafely(
    { paths: dummyPaths, run, togglePeonPing, setStatus },
    { launchCommand },
    { showToast },
  );

  expect(result).toBeUndefined();
  expect(togglePeonPing).toHaveBeenCalledWith(dummyPaths, run);
  expect(setStatus).toHaveBeenCalledWith(status);

  await vi.waitFor(() => {
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Failed to update Peon Ping",
      message: "launch failed",
    });
  });
});

test("runStatusToggleAndRefreshMenuBarSafely does not show a toast for the ignored activation error", async () => {
  const { run } = createRunStub();
  const status: PeonPingStatus = { enabled: true };
  const togglePeonPing = vi.fn(() => ({ message: "ok", status }));
  const setStatus = vi.fn();
  const launchCommand = vi.fn().mockRejectedValue(
    new Error(
      'Command "Peon Ping Menu Bar" must be activated before it can be run in the background',
    ),
  );
  const showToast = vi.fn().mockResolvedValue(undefined);

  const result = runStatusToggleAndRefreshMenuBarSafely(
    { paths: dummyPaths, run, togglePeonPing, setStatus },
    { launchCommand },
    { showToast },
  );

  expect(result).toBeUndefined();

  await Promise.resolve();
  await Promise.resolve();

  expect(showToast).not.toHaveBeenCalled();
});

test("runSetVolumeAction calls setVolume and updates config state", () => {
  const config = makeConfig({ volume: 0.75 });
  const setVolume = vi.fn(() => config);
  const setConfig = vi.fn();
  const { run } = createRunStub();

  const result = runSetVolumeAction(
    { paths: dummyPaths, run, setVolume, setConfig },
    0.75,
  );

  expect(setVolume).toHaveBeenCalledWith(dummyPaths, run, 0.75);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runSetActivePackAction calls setActivePack and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ activePack: "glados" });
  const setActivePack = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetActivePackAction(
    { paths: dummyPaths, run, setActivePack, setConfig },
    "glados",
  );

  expect(setActivePack).toHaveBeenCalledWith(dummyPaths, run, "glados");
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runNextPackAction calls advanceToNextPack and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ activePack: "glados" });
  const advanceToNextPack = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runNextPackAction({
    paths: dummyPaths,
    run,
    advanceToNextPack,
    setConfig,
  });

  expect(advanceToNextPack).toHaveBeenCalledWith(dummyPaths, run);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runToggleNotificationsAction calls setDesktopNotifications and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ desktopNotifications: false });
  const setDesktopNotifications = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runToggleNotificationsAction(
    { paths: dummyPaths, run, setDesktopNotifications, setConfig },
    false,
  );

  expect(setDesktopNotifications).toHaveBeenCalledWith(dummyPaths, run, false);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runToggleHeadphonesOnlyAction calls setHeadphonesOnly and updates config state", () => {
  const config = makeConfig({ headphonesOnly: true });
  const setHeadphonesOnly = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runToggleHeadphonesOnlyAction(
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

test("runSetRotationModeAction calls setPackRotationMode and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ packRotationMode: "round-robin" });
  const setPackRotationMode = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetRotationModeAction(
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

test("runToggleCategoryAction calls setCategoryEnabled and updates config state", () => {
  const config = makeConfig({
    categories: {
      ...makeConfig().categories,
      "task.complete": false,
    },
  });
  const setCategoryEnabled = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runToggleCategoryAction(
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

test("runSetNotificationStyleAction calls setNotificationStyle and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ notificationStyle: "standard" });
  const setNotificationStyle = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetNotificationStyleAction(
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

test("runSetNotificationPositionAction calls setNotificationPosition and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ notificationPosition: "top-right" });
  const setNotificationPosition = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetNotificationPositionAction(
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

test("runSetDismissTimeAction calls setNotificationDismissTime and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ notificationDismissSeconds: 8 });
  const setNotificationDismissTime = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetDismissTimeAction(
    { paths: dummyPaths, run, setNotificationDismissTime, setConfig },
    8,
  );

  expect(setNotificationDismissTime).toHaveBeenCalledWith(dummyPaths, run, 8);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runToggleMobileAction calls setMobileNotifications and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({
    mobileNotifyEnabled: true,
    mobileNotifyConfigured: true,
  });
  const setMobileNotifications = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runToggleMobileAction(
    { paths: dummyPaths, run, setMobileNotifications, setConfig },
    true,
  );

  expect(setMobileNotifications).toHaveBeenCalledWith(dummyPaths, run, true);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});
