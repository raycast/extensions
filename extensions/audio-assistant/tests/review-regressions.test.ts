import assert from "node:assert/strict";
import test from "node:test";
import { SessionBridge } from "../src/services/session-bridge";
import { DemoMusicService } from "../src/services/demo";
import { LiveMusicService } from "../src/services/live";

test("pushed routes share demo playback and refreshed state without creating another service", async () => {
  const service = new DemoMusicService();
  const bridge = new SessionBridge<{ service: DemoMusicService; revision: number }>();
  let notifications = 0;
  const unsubscribe = bridge.subscribe(() => {
    notifications++;
  });
  bridge.publish({ service, revision: 0 });
  const route = bridge.getSnapshot()!;
  const track = (await service.search({ query: "", view: "tracks", limit: 1 })).items[0]!;
  assert.equal(track.kind, "track");
  if (track.kind !== "track") throw new Error("Fixture track missing");
  await service.enqueue("demo-player-0", track, "play-now");
  assert.equal((await route.service.getQueues())[0]?.entries.length, 1);
  bridge.publish({ service, revision: 1 });
  assert.equal(bridge.getSnapshot()?.revision, 1);
  unsubscribe();
  bridge.publish({ service, revision: 2 });
  assert.equal(notifications, 2);
  assert.equal((await new DemoMusicService().getQueues())[0]?.entries.length, 0);
});

test("queue paging includes the current entry beyond 200 and detects incomplete responses", async () => {
  const offsets: unknown[] = [];
  let incomplete = false;
  const service = new LiveMusicService({
    serverUrl: "https://music.example.test",
    client: {
      command: async (command, args = {}) => {
        if (command === "player_queues/all") return [{ queue_id: "q", items: 250, current_index: 220 }];
        if (command === "player_queues/items") {
          offsets.push(args.offset);
          const offset = Number(args.offset);
          return incomplete && offset > 0
            ? []
            : Array.from({ length: Math.min(200, 250 - offset) }, (_, i) => ({
                queue_item_id: `entry-${offset + i}`,
                name: "Same Song",
              }));
        }
        throw new Error(command);
      },
    },
  });
  const queue = (await service.getQueues())[0]!;
  assert.equal(queue.entries.length, 250);
  assert.equal(queue.entries[queue.currentIndex!]?.id, "entry-220");
  assert.deepEqual(offsets, [0, 200]);
  incomplete = true;
  await assert.rejects(service.getQueues(), /complete queue/);
});

test("shortcuts declare explicit macOS and Windows mappings without conflicting with text editing or ActionPanel", async () => {
  const { shortcuts } = await import("../src/ui/shortcuts");
  // Volume controls use alt on Windows, opt on macOS
  assert.deepEqual(shortcuts.volumeUp, {
    macOS: { modifiers: ["opt"], key: "=" },
    Windows: { modifiers: ["alt"], key: "=" },
  });
  assert.deepEqual(shortcuts.volumeDown, {
    macOS: { modifiers: ["opt"], key: "-" },
    Windows: { modifiers: ["alt"], key: "-" },
  });
  // Play/Pause
  assert.deepEqual(shortcuts.playPause, {
    macOS: { modifiers: ["opt"], key: "enter" },
    Windows: { modifiers: ["alt"], key: "enter" },
  });
  // Next / Previous
  assert.deepEqual(shortcuts.next, {
    macOS: { modifiers: ["opt"], key: "." },
    Windows: { modifiers: ["alt"], key: "." },
  });
  assert.deepEqual(shortcuts.previous, {
    macOS: { modifiers: ["opt"], key: "," },
    Windows: { modifiers: ["alt"], key: "," },
  });
  // Mute
  assert.deepEqual(shortcuts.mute, {
    macOS: { modifiers: ["opt"], key: "m" },
    Windows: { modifiers: ["alt"], key: "m" },
  });
  // Show Queue
  assert.deepEqual(shortcuts.queue, {
    macOS: { modifiers: ["opt"], key: "q" },
    Windows: { modifiers: ["alt"], key: "q" },
  });
  // Now Playing
  assert.deepEqual(shortcuts.nowPlaying, {
    macOS: { modifiers: ["opt"], key: "i" },
    Windows: { modifiers: ["alt"], key: "i" },
  });
  // Shuffle / Repeat
  assert.deepEqual(shortcuts.shuffle, {
    macOS: { modifiers: ["opt"], key: "s" },
    Windows: { modifiers: ["alt"], key: "s" },
  });
  assert.deepEqual(shortcuts.repeat, {
    macOS: { modifiers: ["opt"], key: "r" },
    Windows: { modifiers: ["alt"], key: "r" },
  });
  // Refresh
  assert.deepEqual(shortcuts.refresh, {
    macOS: { modifiers: ["cmd"], key: "r" },
    Windows: { modifiers: ["ctrl"], key: "r" },
  });
  // Preferences
  assert.deepEqual(shortcuts.preferences, {
    macOS: { modifiers: ["cmd"], key: "." },
    Windows: { modifiers: ["ctrl"], key: "." },
  });
  // Add to Queue is alt+a
  assert.deepEqual(shortcuts.addToQueue, {
    macOS: { modifiers: ["opt"], key: "a" },
    Windows: { modifiers: ["alt"], key: "a" },
  });
  // Play Next is ctrl+alt+n
  assert.deepEqual(shortcuts.playNext, {
    macOS: { modifiers: ["cmd", "opt"], key: "n" },
    Windows: { modifiers: ["ctrl", "alt"], key: "n" },
  });
  // Browse Artist is ctrl+space
  assert.deepEqual(shortcuts.browseArtist, {
    macOS: { modifiers: ["cmd"], key: "space" },
    Windows: { modifiers: ["ctrl"], key: "space" },
  });
  // Browse Album is ctrl+shift+space
  assert.deepEqual(shortcuts.browseAlbum, {
    macOS: { modifiers: ["cmd", "shift"], key: "space" },
    Windows: { modifiers: ["ctrl", "shift"], key: "space" },
  });
  // Verify no shortcut uses plain "k" (action panel), plain "c" (copy), plain "a" (select all), or "v" (paste)
  for (const [name, shortcut] of Object.entries(shortcuts)) {
    const s = shortcut as {
      Windows: { modifiers: string[]; key: string };
      macOS: { modifiers: string[]; key: string };
    };
    assert.ok(s.Windows && s.macOS, `${name} has both Windows and macOS mappings`);
    assert.notEqual(s.Windows.key, "k", `${name} must not override ActionPanel (Ctrl+K)`);
    if (s.Windows.key === "a" && s.Windows.modifiers.includes("ctrl")) {
      assert.ok(s.Windows.modifiers.includes("shift"), `${name} must not conflict with Select All (Ctrl+A)`);
    }
    assert.notEqual(s.Windows.key, "c", `${name} must not conflict with Copy (Ctrl+C)`);
    assert.notEqual(s.Windows.key, "v", `${name} must not conflict with Paste (Ctrl+V)`);
  }
});

test("inactive queue failure does not block active queue refresh", async () => {
  const service = new LiveMusicService({
    serverUrl: "https://music.example.test",
    client: {
      command: async (command, args = {}) => {
        if (command === "player_queues/all") {
          return [
            { queue_id: "q-active", items: 1, current_index: 0, active: true },
            { queue_id: "q-inactive", items: 50, current_index: null, active: false },
          ];
        }
        if (command === "player_queues/items") {
          if (args.queue_id === "q-active") {
            return [{ queue_item_id: "active-1", name: "Active Song" }];
          }
          if (args.queue_id === "q-inactive") {
            throw new Error("Inactive player queue network failure");
          }
        }
        throw new Error(command);
      },
    },
  });
  const queues = await service.getQueues();
  assert.equal(queues.length, 2);
  const active = queues.find((q) => q.id === "q-active");
  const inactive = queues.find((q) => q.id === "q-inactive");
  assert.equal(active?.entries.length, 1);
  assert.equal(active?.entries[0]?.id, "active-1");
  assert.equal(inactive?.entries.length, 0);
  assert.equal(inactive?.active, false);
});

test("search pager accumulates warnings across pages without duplicates", async () => {
  const { SearchPager } = await import("../src/services/search-pager");
  type PagerState = import("../src/services/search-pager").PagerState;
  let state: PagerState | undefined;
  const pager = new SearchPager(
    (request) => {
      if (request.cursor === "page-1") {
        return Promise.resolve({
          items: [
            {
              kind: "track" as const,
              uri: "track:2",
              provider: "p",
              itemId: "2",
              name: "Song 2",
              artist: "A",
              artistUris: [],
              album: "",
              duration: 100,
            },
          ],
          nextCursor: undefined,
          warnings: ["Warning A", "Warning B"],
        });
      }
      return Promise.resolve({
        items: [
          {
            kind: "track" as const,
            uri: "track:1",
            provider: "p",
            itemId: "1",
            name: "Song 1",
            artist: "A",
            artistUris: [],
            album: "",
            duration: 100,
          },
        ],
        nextCursor: "page-1",
        warnings: ["Warning A"],
      });
    },
    { query: "test", view: "tracks", limit: 1 },
    (next) => {
      state = next;
    },
  );

  await pager.loadMore();
  assert.deepEqual(state?.warnings, ["Warning A"]);

  await pager.loadMore();
  assert.deepEqual(state?.warnings, ["Warning A", "Warning B"]);
});

test("custom 3-part shortcut preferences override defaults while protecting forbidden and invalid keys", async () => {
  const { getShortcuts } = await import("../src/ui/shortcuts");

  // Test valid 2-key combo override (alt + x + na)
  const custom = getShortcuts({
    shortcutPlayPauseMod1: "alt",
    shortcutPlayPauseMod2: "x",
    shortcutPlayPauseKey: "na",
    shortcutVolumeUpMod1: "ctrl",
    shortcutVolumeUpMod2: "shift",
    shortcutVolumeUpKey: "]",
  });
  const asPlatform = (s: unknown) =>
    s as { Windows: { modifiers: string[]; key: string }; macOS: { modifiers: string[]; key: string } };
  assert.equal(asPlatform(custom.playPause).Windows.key, "x");
  assert.deepEqual(asPlatform(custom.playPause).Windows.modifiers, ["alt"]);
  assert.deepEqual(asPlatform(custom.playPause).macOS.modifiers, ["opt"]);

  // Test valid 3-key combo override (ctrl + shift + ])
  assert.equal(asPlatform(custom.volumeUp).Windows.key, "]");
  assert.deepEqual(asPlatform(custom.volumeUp).Windows.modifiers, ["ctrl", "shift"]);
  assert.deepEqual(asPlatform(custom.volumeUp).macOS.modifiers, ["cmd", "shift"]);

  // Attempting to override with forbidden key 'k' (ActionPanel) falls back to default (enter)
  const forbidden = getShortcuts({
    shortcutPlayPauseMod1: "ctrl",
    shortcutPlayPauseMod2: "k",
    shortcutPlayPauseKey: "na",
  });
  assert.equal(asPlatform(forbidden.playPause).Windows.key, "enter");

  // Issue 3: Invalid 2-key combo with modifier as Part 2 (ctrl + shift + na) falls back to default (enter)
  const modifierAsKey = getShortcuts({
    shortcutPlayPauseMod1: "ctrl",
    shortcutPlayPauseMod2: "shift",
    shortcutPlayPauseKey: "na",
  });
  assert.equal(asPlatform(modifierAsKey.playPause).Windows.key, "enter");

  // Invalid 2-key combo with alt as Part 2 (alt + alt + na) falls back to default (enter)
  const altAsKey = getShortcuts({
    shortcutPlayPauseMod1: "alt",
    shortcutPlayPauseMod2: "alt",
    shortcutPlayPauseKey: "na",
  });
  assert.equal(asPlatform(altAsKey.playPause).Windows.key, "enter");

  // Invalid 3-key combo with non-modifier as Part 2 (ctrl + a + b) falls back to default (enter)
  const nonModPart2 = getShortcuts({
    shortcutPlayPauseMod1: "ctrl",
    shortcutPlayPauseMod2: "a",
    shortcutPlayPauseKey: "b",
  });
  assert.equal(asPlatform(nonModPart2.playPause).Windows.key, "enter");
});
