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
  // Volume controls use ctrl on both platforms
  assert.deepEqual(shortcuts.volumeUp, {
    macOS: { modifiers: ["ctrl"], key: "=" },
    Windows: { modifiers: ["ctrl"], key: "=" },
  });
  assert.deepEqual(shortcuts.volumeDown, {
    macOS: { modifiers: ["ctrl"], key: "-" },
    Windows: { modifiers: ["ctrl"], key: "-" },
  });
  // Play/Pause
  assert.deepEqual(shortcuts.playPause, {
    macOS: { modifiers: ["cmd"], key: "p" },
    Windows: { modifiers: ["ctrl"], key: "p" },
  });
  // Add to Queue is primary+shift+a, not plain primary+a
  assert.deepEqual(shortcuts.addToQueue, {
    macOS: { modifiers: ["cmd", "shift"], key: "a" },
    Windows: { modifiers: ["ctrl", "shift"], key: "a" },
  });
  // Play Next is primary+shift+n
  assert.deepEqual(shortcuts.playNext, {
    macOS: { modifiers: ["cmd", "shift"], key: "n" },
    Windows: { modifiers: ["ctrl", "shift"], key: "n" },
  });
  // Verify no shortcut uses plain "k" (action panel), plain "c" (copy), plain "a" (select all), or "v" (paste)
  for (const [name, shortcut] of Object.entries(shortcuts)) {
    const s = shortcut as {
      Windows: { modifiers: string[]; key: string };
      macOS: { modifiers: string[]; key: string };
    };
    assert.ok(s.Windows && s.macOS, `${name} has both Windows and macOS mappings`);
    assert.notEqual(s.Windows.key, "k", `${name} must not override ActionPanel (Ctrl+K)`);
    if (s.Windows.key === "a") {
      assert.ok(s.Windows.modifiers.includes("shift"), `${name} must not conflict with Select All (Ctrl+A)`);
    }
    assert.notEqual(s.Windows.key, "c", `${name} must not conflict with Copy (Ctrl+C)`);
    assert.notEqual(s.Windows.key, "v", `${name} must not conflict with Paste (Ctrl+V)`);
  }
});
