import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LiveMusicService } from "../src/services/live";
import { DemoMusicService } from "../src/services/demo";
import { decodeTrack } from "../src/services/wire";
import { DEFAULT_SHORTCUT_CONFIG, getShortcuts } from "../src/ui/shortcuts";
import { ShortcutSettings, validateShortcut, type ShortcutConfig } from "../src/services/shortcut-settings";
const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, "fixtures", `${name}.json`), "utf8"));
function harness(initial = false, failWrite = false, ignoreWrite = false) {
  let favorite = initial;
  const calls: { command: string; args: Record<string, unknown> }[] = [];
  const raw = fixture("tracks")[0];
  const live = new LiveMusicService({
    serverUrl: "https://fixture.invalid",
    client: {
      command: async (command, args = {}) => {
        calls.push({ command, args });
        if (command === "music/tracks/get") return { ...raw, favorite };
        if (command === "players/all") return fixture("players");
        if (command === "player_queues/all") return fixture("queues");
        if (command === "player_queues/get")
          return { queue_id: "whole-home", current_item: { media_item: { ...raw, media_type: "track", favorite } } };
        if (command.startsWith("music/favorites/")) {
          if (!ignoreWrite) favorite = command.endsWith("add_item");
          if (failWrite) throw new Error("Timed out");
          return null;
        }
        throw new Error("Unexpected command");
      },
    },
  });
  return { live, calls, track: decodeTrack({ ...raw, favorite: !initial }) };
}
test("favorite toggle rereads stale state, uses canonical IDs, and confirms add/remove", async () => {
  const h = harness();
  assert.equal((await h.live.toggleTrackFavorite(h.track)).favorite, true);
  assert.equal((await h.live.toggleTrackFavorite(h.track)).favorite, false);
  const writes = h.calls.filter((c) => c.command.startsWith("music/favorites/"));
  assert.deepEqual(writes, [
    { command: "music/favorites/add_item", args: { item: h.track.uri } },
    { command: "music/favorites/remove_item", args: { media_type: "track", library_item_id: h.track.itemId } },
  ]);
  assert.equal(h.calls.filter((c) => c.command === "music/tracks/get").length, 4);
});
test("an ambiguous mutation is reconciled once and never replayed or reported successful", async () => {
  const h = harness(false, true);
  await assert.rejects(h.live.toggleTrackFavorite(h.track), /Timed out/);
  assert.equal(h.calls.filter((c) => c.command.startsWith("music/favorites/")).length, 1);
  assert.equal(h.calls.filter((c) => c.command === "music/tracks/get").length, 2);
  const ignored = harness(false, false, true);
  await assert.rejects(ignored.live.toggleTrackFavorite(ignored.track), /could not be confirmed/);
});
test("playing-track favorite resolves the effective server queue instead of using player ID", async () => {
  const h = harness();
  const result = await h.live.toggleCurrentTrackFavorite("living-room");
  assert.equal(result.track.uri, h.track.uri);
  assert.deepEqual(h.calls.find((c) => c.command === "player_queues/get")?.args, { queue_id: "whole-home" });
  await assert.rejects(h.live.toggleCurrentTrackFavorite("removed"), /unavailable/);
});
test("unresolved/non-track current media and untrusted favorite status cannot cause a write", async () => {
  for (const media of [null, { media_type: "radio" }]) {
    const commands: string[] = [];
    const live = new LiveMusicService({
      serverUrl: "https://fixture.invalid",
      client: {
        command: async (command) => {
          commands.push(command);
          if (command === "players/all") return fixture("players");
          if (command === "player_queues/all") return fixture("queues");
          if (command === "player_queues/get") return { queue_id: "whole-home", current_item: { media_item: media } };
          throw new Error("No mutation expected");
        },
      },
    });
    await assert.rejects(live.toggleCurrentTrackFavorite("living-room"));
    assert.ok(commands.every((command) => !command.startsWith("music/favorites/")));
  }
  const h = harness();
  const live = new LiveMusicService({
    serverUrl: "https://fixture.invalid",
    client: {
      command: async (command) => {
        assert.equal(command, "music/tracks/get");
        return { ...fixture("tracks")[0], favorite: "false" };
      },
    },
  });
  await assert.rejects(live.toggleTrackFavorite(h.track), /did not report/);
});
test("existing shortcut configurations gain new defaults without losing customizations", async () => {
  const config: ShortcutConfig = { ...DEFAULT_SHORTCUT_CONFIG, playPause: { mod1: "alt", mod2: "x", key: "na" } };
  delete config.favoritePlaying;
  delete config.favoriteSelected;
  const storage = new ShortcutSettings(
    { getItem: async () => JSON.stringify({ version: 1, config, reviewed: true }), setItem: async () => {} },
    () => ({}),
  );
  await storage.initialize();
  assert.equal(storage.getSnapshot().error, undefined);
  assert.deepEqual(storage.getSnapshot().config.playPause, config.playPause);
  assert.deepEqual(storage.getSnapshot().config.favoritePlaying, DEFAULT_SHORTCUT_CONFIG.favoritePlaying);
  const keys = getShortcuts();
  assert.deepEqual(keys.favoritePlaying, {
    Windows: { modifiers: ["alt"], key: "f" },
    macOS: { modifiers: ["opt"], key: "f" },
  });
  assert.deepEqual(keys.favoriteSelected, {
    Windows: { modifiers: ["alt", "shift"], key: "f" },
    macOS: { modifiers: ["opt", "shift"], key: "f" },
  });
  assert.ok(
    validateShortcut("favoritePlaying", DEFAULT_SHORTCUT_CONFIG.favoritePlaying!, {
      ...DEFAULT_SHORTCUT_CONFIG,
      playPause: DEFAULT_SHORTCUT_CONFIG.favoritePlaying!,
    }),
  );
  await storage.save("favoritePlaying", { mod1: "ctrl", mod2: "shift", key: "g" });
  assert.equal(storage.getSnapshot().config.favoritePlaying?.key, "g");
});
test("demo favorite toggles update the same track in the queue and Favorites results", async () => {
  const demo = new DemoMusicService();
  const page = await demo.search({ view: "tracks", query: "", limit: 10 });
  const track = page.items.find((i) => i.kind === "track")!;
  assert.equal(track.kind, "track");
  if (track.kind !== "track") return;
  await demo.enqueue("demo-player-0", track, "play-now");
  const result = await demo.toggleCurrentTrackFavorite("demo-player-0");
  assert.equal(result.favorite, false);
  assert.ok(
    !(await demo.search({ view: "favorites", query: "", limit: 10 })).items.some(
      (i) => i.kind !== "player" && i.uri === track.uri,
    ),
  );
  assert.equal((await demo.toggleTrackFavorite(track)).favorite, true);
  assert.equal((await demo.getQueues())[0]?.entries[0]?.track.favorite, true);
});
