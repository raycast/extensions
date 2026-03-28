import { expect, test } from "vitest";
import type { PeonPingCategoryKey, PeonPingConfig } from "../src/lib/peon-ping-config";
import {
  buildSettingsSections,
  type NotificationPositionRowItem,
  type NotificationStyleRowItem,
  type VolumeStepItem,
  type VoicePackRowItem,
} from "../src/lib/peon-ping-settings-list";

const DEFAULT_CATEGORIES: Record<PeonPingCategoryKey, boolean> = {
  "session.start": true,
  "task.acknowledge": false,
  "task.complete": true,
  "task.error": true,
  "input.required": true,
  "resource.limit": true,
  "user.spam": true,
};

const CATEGORY_KEYS_ORDER: PeonPingCategoryKey[] = [
  "session.start",
  "task.acknowledge",
  "task.complete",
  "task.error",
  "input.required",
  "resource.limit",
  "user.spam",
];

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

test("buildSettingsSections returns sections in the unified command order", () => {
  const sections = buildSettingsSections({
    config: makeConfig(),
    packs: [
      { name: "glados", displayName: "GLaDOS (Portal)" },
      { name: "peon", displayName: "Peon (Warcraft III)" },
    ],
  });

  expect(sections.map((section) => section.title)).toEqual([
    "Status",
    "Volume",
    "Voice Pack",
    "Rotation",
    "Sound Categories",
    "Notifications",
    "Audio",
  ]);
});

test("buildSettingsSections exposes a global toggle row in Status", () => {
  const [statusSection] = buildSettingsSections({
    config: makeConfig({ effectivelyEnabled: true }),
    packs: [],
  });

  expect(statusSection.items).toContainEqual({
    kind: "status",
    title: "Peon Ping",
    enabled: true,
    action: {
      kind: "toggleEnabled",
      nextEnabled: false,
      title: "Turn Peon Ping Off",
    },
  });
});

test("buildSettingsSections shows current volume label on the active volume step", () => {
  const sections = buildSettingsSections({
    config: makeConfig({ volume: 0.75 }),
    packs: [],
  });
  const volumeSection = sections.find((s) => s.title === "Volume");
  expect(volumeSection).toBeDefined();
  const steps = volumeSection!.items.filter(
    (i): i is VolumeStepItem => i.kind === "volumeStep",
  );
  const current = steps.find((i) => i.isCurrent);
  expect(current?.label).toBe("75%");
});

test("buildSettingsSections shows active pack display name", () => {
  const sections = buildSettingsSections({
    config: makeConfig({ activePack: "glados" }),
    packs: [
      { name: "glados", displayName: "GLaDOS (Portal)" },
      { name: "peon", displayName: "Peon (Warcraft III)" },
    ],
  });
  const voiceSection = sections.find((s) => s.title === "Voice Pack");
  expect(voiceSection).toBeDefined();
  const active = voiceSection!.items
    .filter((i): i is VoicePackRowItem => i.kind === "voicePack")
    .find((i) => i.isActive);
  expect(active?.displayName).toBe("GLaDOS (Portal)");
});

test("buildSettingsSections includes one category row per PeonPingCategoryKey", () => {
  const sections = buildSettingsSections({
    config: makeConfig(),
    packs: [],
  });
  const catSection = sections.find((s) => s.title === "Sound Categories");
  expect(catSection).toBeDefined();
  const keys = catSection!.items
    .filter((i) => i.kind === "category")
    .map((i) => {
      if (i.kind !== "category") {
        throw new Error("expected category");
      }
      return i.categoryKey;
    });
  expect(keys).toEqual(CATEGORY_KEYS_ORDER);
});

test("buildSettingsSections shows notification style label", () => {
  const sections = buildSettingsSections({
    config: makeConfig({ notificationStyle: "standard" }),
    packs: [],
  });
  const notif = sections.find((s) => s.title === "Notifications");
  expect(notif).toBeDefined();
  const styleRow = notif!.items.find((i) => i.kind === "notificationStyle");
  expect(styleRow).toBeDefined();
  if (styleRow?.kind !== "notificationStyle") {
    throw new Error("expected notificationStyle row");
  }
  expect(styleRow.title).toBe("Style: Standard");
});

test("buildSettingsSections shows notification position label", () => {
  const sections = buildSettingsSections({
    config: makeConfig({ notificationPosition: "bottom-left" }),
    packs: [],
  });
  const notif = sections.find((s) => s.title === "Notifications");
  expect(notif).toBeDefined();
  const posRow = notif!.items.find((i) => i.kind === "notificationPosition");
  expect(posRow).toBeDefined();
  if (posRow?.kind !== "notificationPosition") {
    throw new Error("expected notificationPosition row");
  }
  expect(posRow.title).toBe("Position: Bottom Left");
});

test("buildSettingsSections maps dismiss seconds 0 to Persistent label", () => {
  const sections = buildSettingsSections({
    config: makeConfig({ notificationDismissSeconds: 0 }),
    packs: [],
  });
  const notif = sections.find((s) => s.title === "Notifications");
  expect(notif).toBeDefined();
  const dismissRow = notif!.items.find((i) => i.kind === "notificationDismiss");
  expect(dismissRow).toBeDefined();
  if (dismissRow?.kind !== "notificationDismiss") {
    throw new Error("expected notificationDismiss row");
  }
  expect(dismissRow.title).toBe("Dismiss: Persistent");
});

test("notification style row exposes overlay and standard action descriptors", () => {
  const sections = buildSettingsSections({
    config: makeConfig({ notificationStyle: "overlay" }),
    packs: [],
  });
  const notif = sections.find((s) => s.title === "Notifications");
  const styleRow = notif!.items.find(
    (i): i is NotificationStyleRowItem => i.kind === "notificationStyle",
  );
  expect(styleRow.actions.map((a) => a.style)).toEqual(["overlay", "standard"]);
});

test("notification position row exposes all six typed positions", () => {
  const sections = buildSettingsSections({
    config: makeConfig({ notificationPosition: "top-center" }),
    packs: [],
  });
  const notif = sections.find((s) => s.title === "Notifications");
  const posRow = notif!.items.find(
    (i): i is NotificationPositionRowItem => i.kind === "notificationPosition",
  );
  expect(posRow.actions.map((a) => a.position)).toEqual([
    "top-center",
    "top-right",
    "top-left",
    "bottom-right",
    "bottom-left",
    "bottom-center",
  ]);
});

test("volume section exposes exactly four typed steps", () => {
  const sections = buildSettingsSections({
    config: makeConfig({ volume: 0.25 }),
    packs: [],
  });
  const vol = sections.find((s) => s.title === "Volume");
  const steps = vol!.items.filter(
    (i): i is VolumeStepItem => i.kind === "volumeStep",
  );
  expect(steps.map((s) => s.step)).toEqual([0.25, 0.5, 0.75, 1.0]);
});

test("mobile notifications row is omitted when unconfigured", () => {
  const sections = buildSettingsSections({
    config: makeConfig({ mobileNotifyConfigured: false }),
    packs: [],
  });
  const notif = sections.find((s) => s.title === "Notifications");
  expect(
    notif!.items.some((i) => i.kind === "mobileNotifications"),
  ).toBe(false);
});

test("notification dismiss cycle nextSeconds matches standard sequence 2→4→8→0→2", () => {
  const sequence: [number, number][] = [
    [2, 4],
    [4, 8],
    [8, 0],
    [0, 2],
  ];
  for (const [current, expectedNext] of sequence) {
    const sections = buildSettingsSections({
      config: makeConfig({ notificationDismissSeconds: current }),
      packs: [],
    });
    const notif = sections.find((s) => s.title === "Notifications");
    const dismissRow = notif!.items.find((i) => i.kind === "notificationDismiss");
    expect(dismissRow?.kind).toBe("notificationDismiss");
    if (dismissRow?.kind !== "notificationDismiss") {
      throw new Error("expected notificationDismiss row");
    }
    expect(dismissRow.action.nextSeconds).toBe(expectedNext);
  }
});

test("notification dismiss nextSeconds for nonstandard values uses smallest cycle preset strictly greater than current, else first preset", () => {
  const cases: [number, number][] = [
    [1, 2],
    [3, 4],
    [5, 8],
    [6, 8],
    [9, 2],
    [100, 2],
  ];
  for (const [current, expectedNext] of cases) {
    const sections = buildSettingsSections({
      config: makeConfig({ notificationDismissSeconds: current }),
      packs: [],
    });
    const notif = sections.find((s) => s.title === "Notifications");
    const dismissRow = notif!.items.find((i) => i.kind === "notificationDismiss");
    expect(dismissRow?.kind).toBe("notificationDismiss");
    if (dismissRow?.kind !== "notificationDismiss") {
      throw new Error("expected notificationDismiss row");
    }
    expect(dismissRow.action.nextSeconds).toBe(expectedNext);
  }
});
