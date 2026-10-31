import assert from "node:assert/strict";
import test from "node:test";
import {
  ShortcutSettings,
  SHORTCUT_STORAGE_KEY,
  shortcutActions,
  toPreferences,
  validateShortcut,
} from "../src/services/shortcut-settings";
import { DEFAULT_SHORTCUT_CONFIG, getShortcuts } from "../src/ui/shortcuts";

function harness(legacy: Record<string, unknown> = {}, raw?: string) {
  let stored = raw;
  let writes = 0;
  let fail = false;
  const store = new ShortcutSettings(
    {
      getItem: async (key) => {
        assert.equal(key, SHORTCUT_STORAGE_KEY);
        return stored;
      },
      setItem: async (key, value) => {
        assert.equal(key, SHORTCUT_STORAGE_KEY);
        if (fail) throw new Error("disk failure");
        stored = value;
        writes++;
      },
    },
    () => legacy,
  );
  return {
    store,
    raw: () => stored,
    writes: () => writes,
    fail: () => {
      fail = true;
    },
  };
}

test("fresh storage preserves every Windows/macOS default and initializes once", async () => {
  const h = harness();
  await Promise.all([h.store.initialize(), h.store.initialize()]);
  assert.equal(h.writes(), 1);
  assert.equal(h.store.getSnapshot().review, true);
  assert.deepEqual(getShortcuts(toPreferences(h.store.getSnapshot().config)), getShortcuts({}));
  assert.deepEqual(new Set(shortcutActions.map((a) => a.id)), new Set(Object.keys(DEFAULT_SHORTCUT_CONFIG)));
});

test("legacy preferences import only shortcut values and persist across launches", async () => {
  const h = harness({
    shortcutPlayPauseMod1: "ctrl",
    shortcutPlayPauseMod2: "shift",
    shortcutPlayPauseKey: "p",
    accessToken: "fixture-not-a-real-token",
    serverUrl: "http://fixture.invalid",
  });
  await h.store.initialize();
  assert.deepEqual(h.store.getSnapshot().config.playPause, { mod1: "ctrl", mod2: "shift", key: "p" });
  assert.ok(!h.raw()!.includes("fixture"));
  const reopened = harness({}, h.raw());
  await reopened.store.initialize();
  assert.deepEqual(reopened.store.getSnapshot().config, h.store.getSnapshot().config);
  assert.equal(reopened.writes(), 0);
});

test("invalid legacy combinations keep the same effective default", async () => {
  const h = harness({
    shortcutNextMod1: "ctrl",
    shortcutNextMod2: "k",
    shortcutNextKey: "na",
    shortcutPlayPauseMod2: "shift",
  });
  await h.store.initialize();
  assert.deepEqual(h.store.getSnapshot().config.next, DEFAULT_SHORTCUT_CONFIG.next);
  assert.deepEqual(h.store.getSnapshot().config.playPause, DEFAULT_SHORTCUT_CONFIG.playPause);
});

test("saved edits publish only after persistence and reset does not resurrect legacy overrides", async () => {
  const h = harness({ shortcutPlayPauseMod2: "p" });
  await h.store.initialize();
  let changes = 0;
  const unsubscribe = h.store.subscribe(() => {
    changes++;
  });
  await h.store.save("playPause", { mod1: "alt", mod2: "x", key: "na" });
  assert.equal(changes, 1);
  await h.store.reset("playPause");
  assert.deepEqual(h.store.getSnapshot().config.playPause, DEFAULT_SHORTCUT_CONFIG.playPause);
  await h.store.acknowledge();
  const reopened = harness({ shortcutPlayPauseMod2: "p" }, h.raw());
  await reopened.store.initialize();
  assert.equal(reopened.store.getSnapshot().review, false);
  assert.deepEqual(reopened.store.getSnapshot().config.playPause, DEFAULT_SHORTCUT_CONFIG.playPause);
  h.fail();
  const before = h.store.getSnapshot();
  await assert.rejects(h.store.save("playPause", { mod1: "alt", mod2: "x", key: "na" }));
  assert.equal(h.store.getSnapshot(), before);
  unsubscribe();
});

test("reserved, duplicate, malformed and platform-colliding shortcuts are explained", () => {
  const c = DEFAULT_SHORTCUT_CONFIG;
  for (const def of [
    { mod1: "ctrl", mod2: ".", key: "na" },
    { mod1: "ctrl", mod2: "shift", key: "." },
    { mod1: "ctrl", mod2: "k", key: "na" },
    { mod1: "ctrl", mod2: "c", key: "na" },
    { mod1: "shift", mod2: "a", key: "na" },
    { mod1: "ctrl", mod2: "physical_ctrl", key: "x" },
    { mod1: "alt", mod2: "shift", key: "na" },
    { mod1: "bogus", mod2: "x", key: "na" },
    c.next!,
  ])
    assert.ok(validateShortcut("playPause", def, c), JSON.stringify(def));
  for (const { id } of shortcutActions) assert.equal(validateShortcut(id, c[id]!, c), undefined, id);
  assert.equal(validateShortcut("playPause", { mod1: "ctrl", mod2: "shift", key: "p" }, c), undefined);
});

test("unreadable storage is not overwritten automatically and reset explicitly recovers", async () => {
  for (const raw of ["broken", '{"version":2}', '{"version":1,"config":{}}']) {
    const h = harness({}, raw);
    await h.store.initialize();
    assert.ok(h.store.getSnapshot().error);
    assert.equal(h.raw(), raw);
    assert.equal(h.writes(), 0);
    await assert.rejects(h.store.acknowledge(), /Restore all defaults/);
    await assert.rejects(h.store.reset("playPause"), /Restore all defaults/);
    assert.equal(h.raw(), raw);
    await h.store.reset();
    assert.equal(h.store.getSnapshot().error, undefined);
    assert.deepEqual(h.store.getSnapshot().config, DEFAULT_SHORTCUT_CONFIG);
  }
});

test("conflicting reset cannot silently take another action's shortcut", async () => {
  const h = harness();
  await h.store.initialize();
  await h.store.save("next", { mod1: "alt", mod2: "x", key: "na" });
  await h.store.save("playPause", DEFAULT_SHORTCUT_CONFIG.next!);
  await assert.rejects(h.store.reset("next"), /Already used/);
  await h.store.reset();
  assert.deepEqual(h.store.getSnapshot().config, DEFAULT_SHORTCUT_CONFIG);
});
