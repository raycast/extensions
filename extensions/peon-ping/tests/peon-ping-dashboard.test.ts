import { expect, test } from "vitest";
import type {
  PeonPingCategoryKey,
  PeonPingConfig,
} from "../src/lib/peon-ping-config";
import {
  buildDashboardItems,
  progressBar,
  type DashboardItem,
} from "../src/lib/peon-ping-dashboard";
import type { InstalledPack } from "../src/lib/peon-ping-packs";

const DEFAULT_CATEGORIES: Record<PeonPingCategoryKey, boolean> = {
  "session.start": true,
  "task.acknowledge": false,
  "task.complete": true,
  "task.error": true,
  "input.required": true,
  "resource.limit": true,
  "user.spam": true,
};

function makeConfig(overrides: Partial<PeonPingConfig> = {}): PeonPingConfig {
  const base: PeonPingConfig = {
    effectivelyEnabled: true,
    volume: 0.5,
    activePack: "peon",
    desktopNotifications: true,
    headphonesOnly: false,
    packRotationMode: "random",
    categories: { ...DEFAULT_CATEGORIES },
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
  };
  return {
    ...base,
    ...overrides,
    categories: {
      ...base.categories,
      ...overrides.categories,
    },
  };
}

const PACKS: InstalledPack[] = [
  { name: "glados", displayName: "GLaDOS (Portal)" },
  { name: "peon", displayName: "Peon (Warcraft III)" },
];

function findItem(
  items: DashboardItem[],
  id: DashboardItem["id"],
): DashboardItem {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`No item with id ${id}`);
  return item;
}

test("buildDashboardItems returns exactly 12 items in order", () => {
  const items = buildDashboardItems({ config: makeConfig(), packs: PACKS });
  expect(items.map((i) => i.id)).toEqual([
    "status",
    "volume",
    "voicePack",
    "rotation",
    "rotationPacks",
    "pathRules",
    "categories",
    "notifications",
    "behavior",
    "audio",
    "debug",
    "trainer",
  ]);
});

test("status item shows On when enabled", () => {
  const items = buildDashboardItems({
    config: makeConfig({ effectivelyEnabled: true }),
    packs: PACKS,
  });
  const status = findItem(items, "status");
  expect(status.accessoryText).toBe("On");
  expect(status.accessoryTagColor).toBe("green");
  expect(status.icon).toBe("pause");
  expect(status.actions[0]).toMatchObject({
    kind: "toggleStatus",
    nextEnabled: false,
  });
});

test("status item shows Off when disabled", () => {
  const items = buildDashboardItems({
    config: makeConfig({ effectivelyEnabled: false }),
    packs: PACKS,
  });
  const status = findItem(items, "status");
  expect(status.accessoryText).toBe("Off");
  expect(status.accessoryTagColor).toBe("red");
  expect(status.icon).toBe("play");
});

test("status metadata includes overview of all settings", () => {
  const items = buildDashboardItems({
    config: makeConfig({ volume: 0.75, activePack: "glados" }),
    packs: PACKS,
  });
  const status = findItem(items, "status");
  const labels = status.metadata.filter((m) => m.kind === "label");
  expect(labels).toContainEqual(
    expect.objectContaining({
      title: "Volume",
      text: `${progressBar(0.75)} 75%`,
    }),
  );
  expect(labels).toContainEqual(
    expect.objectContaining({
      title: "Active Pack",
      text: "GLaDOS (Portal)",
    }),
  );
  expect(labels).toContainEqual(
    expect.objectContaining({ title: "Rotation", text: "Random" }),
  );
});

test("volume item shows current volume percentage", () => {
  const items = buildDashboardItems({
    config: makeConfig({ volume: 0.75 }),
    packs: [],
  });
  const vol = findItem(items, "volume");
  expect(vol.accessoryText).toBe("75%");
  expect(vol.actions).toHaveLength(4);
  expect(vol.actions.map((a) => a.title)).toEqual([
    "Set to 25%",
    "Set to 50%",
    "Set to 75%",
    "Set to 100%",
  ]);
});

test("volume metadata highlights current level in tagList", () => {
  const items = buildDashboardItems({
    config: makeConfig({ volume: 0.5 }),
    packs: [],
  });
  const vol = findItem(items, "volume");
  const tagList = vol.metadata.find((m) => m.kind === "tagList");
  expect(tagList).toBeDefined();
  if (tagList?.kind !== "tagList") throw new Error("expected tagList");
  const greenTag = tagList.items.find((t) => t.color === "green");
  expect(greenTag?.text).toBe("50%");
});

test("voicePack item shows active pack display name", () => {
  const items = buildDashboardItems({
    config: makeConfig({ activePack: "glados" }),
    packs: PACKS,
  });
  const vp = findItem(items, "voicePack");
  expect(vp.accessoryText).toBe("GLaDOS (Portal)");
});

test("voicePack falls back to raw name when pack not in installed list", () => {
  const items = buildDashboardItems({
    config: makeConfig({ activePack: "unknown-pack" }),
    packs: PACKS,
  });
  const vp = findItem(items, "voicePack");
  expect(vp.accessoryText).toBe("unknown-pack");
});

test("voicePack actions include one per pack plus Next Pack", () => {
  const items = buildDashboardItems({
    config: makeConfig(),
    packs: PACKS,
  });
  const vp = findItem(items, "voicePack");
  expect(vp.actions).toHaveLength(3);
  expect(vp.actions[0]).toMatchObject({
    kind: "setActivePack",
    packName: "glados",
  });
  expect(vp.actions[1]).toMatchObject({
    kind: "setActivePack",
    packName: "peon",
  });
  expect(vp.actions[2]).toMatchObject({ kind: "advanceToNextPack" });
});

test("rotation item shows current mode", () => {
  const items = buildDashboardItems({
    config: makeConfig({ packRotationMode: "round-robin" }),
    packs: [],
  });
  const rot = findItem(items, "rotation");
  expect(rot.accessoryText).toBe("Round Robin");
  expect(rot.actions).toHaveLength(3);
});

test("rotationPacks item shows the current pack count", () => {
  const items = buildDashboardItems({
    config: makeConfig({ packRotation: ["peon", "glados"] }),
    packs: PACKS,
  });
  const rotationPacks = findItem(items, "rotationPacks");
  expect(rotationPacks.accessoryText).toBe("2 packs");
});

test("rotationPacks metadata lists active rotation members by display name", () => {
  const items = buildDashboardItems({
    config: makeConfig({ packRotation: ["glados", "peon"] }),
    packs: PACKS,
  });
  const rotationPacks = findItem(items, "rotationPacks");
  const labels = rotationPacks.metadata.filter((entry) => entry.kind === "label");
  expect(labels).toContainEqual(
    expect.objectContaining({
      title: "1",
      text: "GLaDOS (Portal)",
    }),
  );
  expect(labels).toContainEqual(
    expect.objectContaining({
      title: "2",
      text: "Peon (Warcraft III)",
    }),
  );
});

test("rotationPacks actions include remove for current packs and add for missing packs", () => {
  const items = buildDashboardItems({
    config: makeConfig({ packRotation: ["peon"] }),
    packs: PACKS,
  });
  const rotationPacks = findItem(items, "rotationPacks");
  expect(rotationPacks.drillable).toBe(true);
  expect(rotationPacks.actions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "removePackFromRotation",
        packName: "peon",
        isCurrent: true,
      }),
      expect.objectContaining({
        kind: "addPackToRotation",
        packName: "glados",
        isCurrent: false,
      }),
    ]),
  );
});

test("rotationPacks includes a clear action when rotation is not empty", () => {
  const items = buildDashboardItems({
    config: makeConfig({ packRotation: ["peon"] }),
    packs: PACKS,
  });
  const rotationPacks = findItem(items, "rotationPacks");
  expect(rotationPacks.actions).toContainEqual(
    expect.objectContaining({ kind: "clearPackRotation" }),
  );
});

test("pathRules item shows the configured rule count", () => {
  const items = buildDashboardItems({
    config: makeConfig({
      pathRules: [
        { pattern: "*/client-a/*", pack: "glados" },
        { pattern: "*/personal/*", pack: "peon" },
      ],
    }),
    packs: PACKS,
  });
  const pathRules = findItem(items, "pathRules");
  expect(pathRules.accessoryText).toBe("2 rules");
  expect(pathRules.drillable).toBe(true);
});

test("pathRules metadata shows pattern to pack mapping", () => {
  const items = buildDashboardItems({
    config: makeConfig({
      pathRules: [{ pattern: "*/client-a/*", pack: "glados" }],
    }),
    packs: PACKS,
  });
  const pathRules = findItem(items, "pathRules");
  expect(pathRules.metadata).toContainEqual(
    expect.objectContaining({
      kind: "label",
      title: "*/client-a/*",
      text: "GLaDOS (Portal)",
    }),
  );
});

test("pathRules actions remove configured rules", () => {
  const items = buildDashboardItems({
    config: makeConfig({
      pathRules: [{ pattern: "*/client-a/*", pack: "glados" }],
    }),
    packs: PACKS,
  });
  const pathRules = findItem(items, "pathRules");
  expect(pathRules.subItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "path-rule-*/client-a/*",
        title: "*/client-a/*",
        drillable: false,
        actions: [
          expect.objectContaining({
            kind: "removePathRule",
            pattern: "*/client-a/*",
          }),
        ],
      }),
    ]),
  );
});

test("pathRules shows an empty-state subitem when no rules exist", () => {
  const items = buildDashboardItems({
    config: makeConfig({ pathRules: [] }),
    packs: PACKS,
  });
  const pathRules = findItem(items, "pathRules");
  expect(pathRules.drillable).toBe(true);
  expect(pathRules.subItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "path-rules-empty",
        title: "No Path Rules",
        drillable: false,
        actions: [],
      }),
    ]),
  );
});

test("categories item shows enabled count", () => {
  const items = buildDashboardItems({
    config: makeConfig({
      categories: {
        "session.start": true,
        "task.acknowledge": false,
        "task.complete": true,
        "task.error": false,
        "input.required": false,
        "resource.limit": false,
        "user.spam": false,
      },
    }),
    packs: [],
  });
  const cats = findItem(items, "categories");
  expect(cats.accessoryText).toBe("2/7 enabled");
});

test("categories metadata has one label per category", () => {
  const items = buildDashboardItems({
    config: makeConfig(),
    packs: [],
  });
  const cats = findItem(items, "categories");
  const labels = cats.metadata.filter((m) => m.kind === "label");
  expect(labels).toHaveLength(7);
});

test("categories actions toggle each category", () => {
  const items = buildDashboardItems({
    config: makeConfig(),
    packs: [],
  });
  const cats = findItem(items, "categories");
  expect(cats.actions).toHaveLength(7);
  const firstAction = cats.actions[0];
  expect(firstAction.kind).toBe("toggleCategory");
});

test("notifications item shows desktop status", () => {
  const items = buildDashboardItems({
    config: makeConfig({ desktopNotifications: false }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  expect(notif.accessoryText).toBe("Desktop Off");
});

test("notifications metadata includes style, position, dismiss", () => {
  const items = buildDashboardItems({
    config: makeConfig({
      notificationStyle: "standard",
      notificationPosition: "bottom-left",
      notificationDismissSeconds: 0,
    }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const labels = notif.metadata.filter((m) => m.kind === "label");
  expect(labels).toContainEqual(
    expect.objectContaining({ title: "Style", text: "Standard" }),
  );
  expect(labels).toContainEqual(
    expect.objectContaining({ title: "Position", text: "Bottom Left" }),
  );
  expect(labels).toContainEqual(
    expect.objectContaining({ title: "Dismiss", text: "Persistent" }),
  );
});

test("notifications has subItems instead of flat actions", () => {
  const items = buildDashboardItems({
    config: makeConfig(),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  expect(notif.actions).toHaveLength(0);
  expect(notif.subItems).toBeDefined();
  expect(notif.subItems!.length).toBeGreaterThanOrEqual(4);
});

test("notification subItems include desktop, style, position, dismiss", () => {
  const items = buildDashboardItems({
    config: makeConfig(),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const subIds = notif.subItems!.map((s) => s.id);
  expect(subIds).toContain("notif-desktop");
  expect(subIds).toContain("notif-style");
  expect(subIds).toContain("notif-position");
  expect(subIds).toContain("notif-dismiss");
  expect(subIds).toContain("notif-all-screens");
});

test("notification style subItem is drillable with isCurrent", () => {
  const items = buildDashboardItems({
    config: makeConfig({ notificationStyle: "standard" }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const style = notif.subItems!.find((s) => s.id === "notif-style")!;
  expect(style.drillable).toBe(true);
  expect(style.accessoryText).toBe("Standard");
  const current = style.actions.find((a) => a.isCurrent);
  expect(current).toBeDefined();
  expect(current!.subListTitle).toBe("Standard");
});

test("notification position subItem is drillable with 6 options", () => {
  const items = buildDashboardItems({
    config: makeConfig({ notificationPosition: "bottom-left" }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const pos = notif.subItems!.find((s) => s.id === "notif-position")!;
  expect(pos.drillable).toBe(true);
  expect(pos.accessoryText).toBe("Bottom Left");
  expect(pos.actions).toHaveLength(6);
});

test("notification desktop subItem is a direct toggle", () => {
  const items = buildDashboardItems({
    config: makeConfig({ desktopNotifications: true }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const desktop = notif.subItems!.find((s) => s.id === "notif-desktop")!;
  expect(desktop.drillable).toBe(false);
  expect(desktop.accessoryTagColor).toBe("green");
  expect(desktop.actions).toHaveLength(1);
  expect(desktop.actions[0].kind).toBe("toggleDesktopNotifications");
});

test("notification dismiss subItem is a direct cycle action", () => {
  const items = buildDashboardItems({
    config: makeConfig({ notificationDismissSeconds: 4 }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const dismiss = notif.subItems!.find((s) => s.id === "notif-dismiss")!;
  expect(dismiss.drillable).toBe(false);
  expect(dismiss.accessoryText).toBe("4s");
  expect(dismiss.actions[0].kind).toBe("cycleDismissTime");
});

test("notifications omits mobile subItem when unconfigured", () => {
  const items = buildDashboardItems({
    config: makeConfig({ mobileNotifyConfigured: false }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const mobileLabel = notif.metadata.find(
    (m) => m.kind === "label" && m.title === "Mobile",
  );
  expect(mobileLabel).toBeUndefined();
  const mobileSub = notif.subItems!.find((s) => s.id === "notif-mobile");
  expect(mobileSub).toBeUndefined();
});

test("notifications includes mobile subItem when configured", () => {
  const items = buildDashboardItems({
    config: makeConfig({
      mobileNotifyConfigured: true,
      mobileNotifyEnabled: true,
    }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const mobileLabel = notif.metadata.find(
    (m) => m.kind === "label" && m.title === "Mobile",
  );
  expect(mobileLabel).toBeDefined();
  const mobileSub = notif.subItems!.find((s) => s.id === "notif-mobile");
  expect(mobileSub).toBeDefined();
  expect(mobileSub!.accessoryTagColor).toBe("green");
});

test("audio item shows headphones only status", () => {
  const items = buildDashboardItems({
    config: makeConfig({ headphonesOnly: true }),
    packs: [],
  });
  const audio = findItem(items, "audio");
  expect(audio.accessoryText).toBe("Headphones Only");
  expect(audio.drillable).toBe(true);
  expect(audio.subItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "audio-headphones",
        actions: [
          expect.objectContaining({
            kind: "toggleHeadphonesOnly",
            nextEnabled: false,
          }),
        ],
      }),
      expect.objectContaining({ id: "audio-effects-device" }),
    ]),
  );
});

test("audio item shows All Outputs when headphones off", () => {
  const items = buildDashboardItems({
    config: makeConfig({ headphonesOnly: false }),
    packs: [],
  });
  const audio = findItem(items, "audio");
  expect(audio.accessoryText).toBe("All Outputs");
});

test("audio metadata includes use sound effects device state", () => {
  const items = buildDashboardItems({
    config: makeConfig({ useSoundEffectsDevice: true }),
    packs: [],
  });
  const audio = findItem(items, "audio");
  expect(audio.metadata).toContainEqual(
    expect.objectContaining({
      kind: "label",
      title: "Sound Effects Device",
      text: "On",
    }),
  );
  expect(audio.subItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "audio-effects-device",
        actions: [
          expect.objectContaining({
            kind: "toggleUseSoundEffectsDevice",
            nextEnabled: false,
          }),
        ],
      }),
    ]),
  );
});

test("behavior item shows advanced toggle state and read-only timing metadata", () => {
  const items = buildDashboardItems({
    config: makeConfig({
      meetingDetect: true,
      suppressSubagentComplete: true,
      silentWindowSeconds: 12,
      sessionStartCooldownSeconds: 45,
    }),
    packs: [],
  });
  const behavior = findItem(items, "behavior");
  expect(behavior.accessoryText).toBe("2/2 enabled");
  expect(behavior.metadata).toContainEqual(
    expect.objectContaining({
      kind: "label",
      title: "Silent Window",
      text: "12s",
    }),
  );
  expect(behavior.metadata).toContainEqual(
    expect.objectContaining({
      kind: "label",
      title: "Session Start Cooldown",
      text: "45s",
    }),
  );
  expect(behavior.subItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "behavior-meeting-detect",
        actions: [
          expect.objectContaining({
            kind: "toggleMeetingDetect",
            nextEnabled: false,
          }),
        ],
      }),
      expect.objectContaining({
        id: "behavior-subagent-complete",
        actions: [
          expect.objectContaining({
            kind: "toggleSuppressSubagentComplete",
            nextEnabled: false,
          }),
        ],
      }),
    ]),
  );
  expect(behavior.drillable).toBe(true);
  expect(behavior.subItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "behavior-meeting-detect" }),
      expect.objectContaining({ id: "behavior-subagent-complete" }),
      expect.objectContaining({ id: "behavior-silent-window", actions: [] }),
      expect.objectContaining({ id: "behavior-session-start-cooldown", actions: [] }),
    ]),
  );
});

test("debug item shows current logging state and toggle action", () => {
  const items = buildDashboardItems({
    config: makeConfig({ debugEnabled: true, debugRetentionDays: 30 }),
    packs: [],
  });
  const debug = findItem(items, "debug");
  expect(debug.accessoryText).toBe("On");
  expect(debug.actions).toContainEqual(
    expect.objectContaining({
      kind: "toggleDebugEnabled",
      nextEnabled: false,
    }),
  );
});

test("trainer item shows current trainer state and goals", () => {
  const items = buildDashboardItems({
    config: makeConfig({
      trainer: {
        enabled: true,
        exercises: { pushups: 100, squats: 120 },
        reminderIntervalMinutes: 20,
        reminderMinGapMinutes: 5,
      },
    }),
    packs: [],
  });
  const trainer = findItem(items, "trainer");
  expect(trainer.accessoryText).toBe("On");
  expect(trainer.metadata).toContainEqual(
    expect.objectContaining({
      kind: "label",
      title: "Goals",
      text: "pushups: 100, squats: 120",
    }),
  );
  expect(trainer.drillable).toBe(true);
  expect(trainer.subItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "trainer-enabled",
        actions: [
          expect.objectContaining({
            kind: "toggleTrainerEnabled",
            nextEnabled: false,
          }),
        ],
      }),
      expect.objectContaining({ id: "trainer-goals", actions: [] }),
      expect.objectContaining({ id: "trainer-reminder-interval", actions: [] }),
      expect.objectContaining({ id: "trainer-min-gap", actions: [] }),
    ]),
  );
});

test("drillable is true for multi-choice items, false for toggles", () => {
  const items = buildDashboardItems({ config: makeConfig(), packs: PACKS });
  expect(findItem(items, "status").drillable).toBe(false);
  expect(findItem(items, "volume").drillable).toBe(true);
  expect(findItem(items, "voicePack").drillable).toBe(true);
  expect(findItem(items, "rotation").drillable).toBe(true);
  expect(findItem(items, "rotationPacks").drillable).toBe(true);
  expect(findItem(items, "pathRules").drillable).toBe(true);
  expect(findItem(items, "categories").drillable).toBe(true);
  expect(findItem(items, "notifications").drillable).toBe(true);
  expect(findItem(items, "behavior").drillable).toBe(true);
  expect(findItem(items, "audio").drillable).toBe(true);
  expect(findItem(items, "debug").drillable).toBe(false);
  expect(findItem(items, "trainer").drillable).toBe(true);
});

test("volume actions carry subListTitle and isCurrent", () => {
  const items = buildDashboardItems({
    config: makeConfig({ volume: 0.75 }),
    packs: [],
  });
  const vol = findItem(items, "volume");
  const current = vol.actions.find((a) => a.isCurrent);
  expect(current).toBeDefined();
  expect(current!.subListTitle).toBe("75%");
  const notCurrent = vol.actions.filter((a) => !a.isCurrent);
  expect(notCurrent).toHaveLength(3);
});

test("voicePack actions carry subListTitle and isCurrent for active pack", () => {
  const items = buildDashboardItems({
    config: makeConfig({ activePack: "glados" }),
    packs: PACKS,
  });
  const vp = findItem(items, "voicePack");
  const active = vp.actions.find((a) => a.isCurrent);
  expect(active).toBeDefined();
  expect(active!.subListTitle).toBe("GLaDOS (Portal)");
});

test("rotation actions carry isCurrent for active mode", () => {
  const items = buildDashboardItems({
    config: makeConfig({ packRotationMode: "session_override" }),
    packs: [],
  });
  const rot = findItem(items, "rotation");
  const current = rot.actions.find((a) => a.isCurrent);
  expect(current).toBeDefined();
  expect(current!.title).toBe("Session Override");
});

test("category actions carry subListTitle and isCurrent for enabled state", () => {
  const items = buildDashboardItems({
    config: makeConfig(),
    packs: [],
  });
  const cats = findItem(items, "categories");
  const sessionStart = cats.actions.find(
    (a) => a.kind === "toggleCategory" && a.categoryKey === "session.start",
  );
  expect(sessionStart!.isCurrent).toBe(true);
  expect(sessionStart!.subListTitle).toBe("Session Start");

  const taskAck = cats.actions.find(
    (a) => a.kind === "toggleCategory" && a.categoryKey === "task.acknowledge",
  );
  expect(taskAck!.isCurrent).toBe(false);
});

test("notification subItems carry isCurrent for current settings", () => {
  const items = buildDashboardItems({
    config: makeConfig({
      desktopNotifications: true,
      notificationStyle: "overlay",
      notificationPosition: "top-center",
    }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const style = notif.subItems!.find((s) => s.id === "notif-style")!;
  const overlayAction = style.actions.find(
    (a) => a.kind === "setNotificationStyle" && a.style === "overlay",
  );
  expect(overlayAction!.isCurrent).toBe(true);

  const standardAction = style.actions.find(
    (a) => a.kind === "setNotificationStyle" && a.style === "standard",
  );
  expect(standardAction!.isCurrent).toBe(false);

  const pos = notif.subItems!.find((s) => s.id === "notif-position")!;
  const topCenter = pos.actions.find(
    (a) => a.kind === "setNotificationPosition" && a.position === "top-center",
  );
  expect(topCenter!.isCurrent).toBe(true);
});
