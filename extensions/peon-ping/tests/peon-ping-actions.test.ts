import { expect, test, vi } from "vitest";
import { LaunchType, Toast } from "@raycast/api";
import type {
  PeonPingConfig,
  PeonPingStatus,
} from "../src/lib/peon-ping-config";
import type { PeonPingResolvedPaths } from "../src/lib/peon-ping-paths";
import type { PeonPingCommandRunner } from "../src/lib/peon-ping-service";
import {
  runAddPackToRotationAction,
  runClearPackRotationAction,
  runNextPackAction,
  runRemovePathRuleAction,
  runRemovePackFromRotationAction,
  runSetPathRulePackAction,
  runSetSessionStartCooldownSecondsAction,
  runSetSilentWindowSecondsAction,
  runSetActivePackAction,
  runSetDebugEnabledAction,
  runSetDismissTimeAction,
  runSetNotificationPositionAction,
  runSetNotificationStyleAction,
  runSetRotationModeAction,
  runSetTrainerExerciseGoalAction,
  runSetTrainerReminderIntervalMinutesAction,
  runSetTrainerReminderMinGapMinutesAction,
  runStatusToggleAndRefreshMenuBarSafely,
  runToggleMeetingDetectAction,
  runToggleNotificationAllScreensAction,
  runSetVolumeAction,
  runStatusToggleAndRefreshMenuBar,
  runToggleAction,
  runToggleCategoryAction,
  runToggleHeadphonesOnlyAction,
  runToggleMobileAction,
  runToggleNotificationsAction,
  runSetTrainerEnabledAction,
  runToggleSuppressSubagentCompleteAction,
  runToggleUseSoundEffectsDeviceAction,
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
  const launchCommand = vi
    .fn()
    .mockRejectedValue(
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
  const launchCommand = vi
    .fn()
    .mockRejectedValue(
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

test("runToggleUseSoundEffectsDeviceAction calls setUseSoundEffectsDevice and updates config state", () => {
  const config = makeConfig({ useSoundEffectsDevice: true });
  const setUseSoundEffectsDevice = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runToggleUseSoundEffectsDeviceAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setUseSoundEffectsDevice,
      setConfig,
    },
    true,
  );

  expect(setUseSoundEffectsDevice).toHaveBeenCalledWith(
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

test("runAddPackToRotationAction calls addPackToRotation and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ packRotation: ["peon", "glados"] });
  const addPackToRotation = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runAddPackToRotationAction(
    { paths: dummyPaths, run, addPackToRotation, setConfig },
    "glados",
  );

  expect(addPackToRotation).toHaveBeenCalledWith(dummyPaths, run, "glados");
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runRemovePackFromRotationAction calls removePackFromRotation and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ packRotation: ["peon"] });
  const removePackFromRotation = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runRemovePackFromRotationAction(
    { paths: dummyPaths, run, removePackFromRotation, setConfig },
    "glados",
  );

  expect(removePackFromRotation).toHaveBeenCalledWith(
    dummyPaths,
    run,
    "glados",
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runClearPackRotationAction calls clearPackRotation and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ packRotation: [] });
  const clearPackRotation = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runClearPackRotationAction({
    paths: dummyPaths,
    run,
    clearPackRotation,
    setConfig,
  });

  expect(clearPackRotation).toHaveBeenCalledWith(dummyPaths, run);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runRemovePathRuleAction calls removePathRule and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({
    pathRules: [{ pattern: "*/personal/*", pack: "peon" }],
  });
  const removePathRule = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runRemovePathRuleAction(
    { paths: dummyPaths, run, removePathRule, setConfig },
    "*/client-a/*",
  );

  expect(removePathRule).toHaveBeenCalledWith(dummyPaths, run, "*/client-a/*");
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runSetPathRulePackAction calls setPathRulePack and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({
    pathRules: [{ pattern: "*/client-a/*", pack: "peon" }],
  });
  const setPathRulePack = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetPathRulePackAction(
    { paths: dummyPaths, run, setPathRulePack, setConfig },
    "*/client-a/*",
    "peon",
  );

  expect(setPathRulePack).toHaveBeenCalledWith(
    dummyPaths,
    run,
    "*/client-a/*",
    "peon",
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runSetDebugEnabledAction calls setDebugEnabled and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({ debugEnabled: true });
  const setDebugEnabled = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetDebugEnabledAction(
    { paths: dummyPaths, run, setDebugEnabled, setConfig },
    true,
  );

  expect(setDebugEnabled).toHaveBeenCalledWith(dummyPaths, run, true);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runSetTrainerEnabledAction calls setTrainerEnabled and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({
    trainer: {
      enabled: true,
      exercises: { pushups: 100, squats: 120 },
      reminderIntervalMinutes: 20,
      reminderMinGapMinutes: 5,
    },
  });
  const setTrainerEnabled = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetTrainerEnabledAction(
    { paths: dummyPaths, run, setTrainerEnabled, setConfig },
    true,
  );

  expect(setTrainerEnabled).toHaveBeenCalledWith(dummyPaths, run, true);
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runSetTrainerExerciseGoalAction calls setTrainerExerciseGoal and updates config state", () => {
  const { run } = createRunStub();
  const config = makeConfig({
    trainer: {
      enabled: true,
      exercises: { pushups: 120, squats: 150 },
      reminderIntervalMinutes: 20,
      reminderMinGapMinutes: 5,
    },
  });
  const setTrainerExerciseGoal = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetTrainerExerciseGoalAction(
    { paths: dummyPaths, run, setTrainerExerciseGoal, setConfig },
    "pushups",
    120,
  );

  expect(setTrainerExerciseGoal).toHaveBeenCalledWith(
    dummyPaths,
    run,
    "pushups",
    120,
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

test("runToggleNotificationAllScreensAction calls setNotificationAllScreens and updates config state", () => {
  const config = makeConfig({ notificationAllScreens: false });
  const setNotificationAllScreens = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runToggleNotificationAllScreensAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setNotificationAllScreens,
      setConfig,
    },
    false,
  );

  expect(setNotificationAllScreens).toHaveBeenCalledWith(
    dummyPaths.configFilePath,
    dummyPaths.pausedFilePath,
    false,
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runToggleMeetingDetectAction calls setMeetingDetect and updates config state", () => {
  const config = makeConfig({ meetingDetect: true });
  const setMeetingDetect = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runToggleMeetingDetectAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setMeetingDetect,
      setConfig,
    },
    true,
  );

  expect(setMeetingDetect).toHaveBeenCalledWith(
    dummyPaths.configFilePath,
    dummyPaths.pausedFilePath,
    true,
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runSetSilentWindowSecondsAction calls setSilentWindowSeconds and updates config state", () => {
  const config = makeConfig({ silentWindowSeconds: 15 });
  const setSilentWindowSeconds = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetSilentWindowSecondsAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setSilentWindowSeconds,
      setConfig,
    },
    15,
  );

  expect(setSilentWindowSeconds).toHaveBeenCalledWith(
    dummyPaths.configFilePath,
    dummyPaths.pausedFilePath,
    15,
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runSetSessionStartCooldownSecondsAction calls setSessionStartCooldownSeconds and updates config state", () => {
  const config = makeConfig({ sessionStartCooldownSeconds: 60 });
  const setSessionStartCooldownSeconds = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetSessionStartCooldownSecondsAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setSessionStartCooldownSeconds,
      setConfig,
    },
    60,
  );

  expect(setSessionStartCooldownSeconds).toHaveBeenCalledWith(
    dummyPaths.configFilePath,
    dummyPaths.pausedFilePath,
    60,
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runToggleSuppressSubagentCompleteAction calls setSuppressSubagentComplete and updates config state", () => {
  const config = makeConfig({ suppressSubagentComplete: true });
  const setSuppressSubagentComplete = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runToggleSuppressSubagentCompleteAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setSuppressSubagentComplete,
      setConfig,
    },
    true,
  );

  expect(setSuppressSubagentComplete).toHaveBeenCalledWith(
    dummyPaths.configFilePath,
    dummyPaths.pausedFilePath,
    true,
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runSetTrainerReminderIntervalMinutesAction calls setTrainerReminderIntervalMinutes and updates config state", () => {
  const config = makeConfig({
    trainer: {
      enabled: true,
      exercises: { pushups: 100, squats: 120 },
      reminderIntervalMinutes: 30,
      reminderMinGapMinutes: 5,
    },
  });
  const setTrainerReminderIntervalMinutes = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetTrainerReminderIntervalMinutesAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setTrainerReminderIntervalMinutes,
      setConfig,
    },
    30,
  );

  expect(setTrainerReminderIntervalMinutes).toHaveBeenCalledWith(
    dummyPaths.configFilePath,
    dummyPaths.pausedFilePath,
    30,
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});

test("runSetTrainerReminderMinGapMinutesAction calls setTrainerReminderMinGapMinutes and updates config state", () => {
  const config = makeConfig({
    trainer: {
      enabled: true,
      exercises: { pushups: 100, squats: 120 },
      reminderIntervalMinutes: 20,
      reminderMinGapMinutes: 10,
    },
  });
  const setTrainerReminderMinGapMinutes = vi.fn(() => config);
  const setConfig = vi.fn();

  const result = runSetTrainerReminderMinGapMinutesAction(
    {
      configFilePath: dummyPaths.configFilePath,
      pausedFilePath: dummyPaths.pausedFilePath,
      setTrainerReminderMinGapMinutes,
      setConfig,
    },
    10,
  );

  expect(setTrainerReminderMinGapMinutes).toHaveBeenCalledWith(
    dummyPaths.configFilePath,
    dummyPaths.pausedFilePath,
    10,
  );
  expect(setConfig).toHaveBeenCalledWith(config);
  expect(result).toEqual(config);
});
