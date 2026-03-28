import { expect, test } from "vitest";
import type {
  PeonPingCategoryKey,
  PeonPingConfig,
} from "../src/lib/peon-ping-config";
import {
  buildDashboardItems,
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

test("buildDashboardItems returns exactly 7 items in order", () => {
  const items = buildDashboardItems({ config: makeConfig(), packs: PACKS });
  expect(items.map((i) => i.id)).toEqual([
    "status",
    "volume",
    "voicePack",
    "rotation",
    "categories",
    "notifications",
    "audio",
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
    expect.objectContaining({ title: "Volume", text: "75%" }),
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

test("notifications omits mobile when unconfigured", () => {
  const items = buildDashboardItems({
    config: makeConfig({ mobileNotifyConfigured: false }),
    packs: [],
  });
  const notif = findItem(items, "notifications");
  const mobileLabel = notif.metadata.find(
    (m) => m.kind === "label" && m.title === "Mobile",
  );
  expect(mobileLabel).toBeUndefined();
  const mobileAction = notif.actions.find(
    (a) => a.kind === "toggleMobileNotifications",
  );
  expect(mobileAction).toBeUndefined();
});

test("notifications includes mobile when configured", () => {
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
  const mobileAction = notif.actions.find(
    (a) => a.kind === "toggleMobileNotifications",
  );
  expect(mobileAction).toBeDefined();
});

test("audio item shows headphones only status", () => {
  const items = buildDashboardItems({
    config: makeConfig({ headphonesOnly: true }),
    packs: [],
  });
  const audio = findItem(items, "audio");
  expect(audio.accessoryText).toBe("Headphones Only");
  expect(audio.actions[0]).toMatchObject({
    kind: "toggleHeadphonesOnly",
    nextEnabled: false,
  });
});

test("audio item shows All Outputs when headphones off", () => {
  const items = buildDashboardItems({
    config: makeConfig({ headphonesOnly: false }),
    packs: [],
  });
  const audio = findItem(items, "audio");
  expect(audio.accessoryText).toBe("All Outputs");
});
