import assert from "node:assert/strict";
import test from "node:test";
import { clampVolume, nextRepeat, requirePlayer, requireQueue, searchLibrary } from "../src/domain/policy";
import { demoData } from "../src/services/demo-data";
import { DemoMusicService } from "../src/services/demo";
import { PlaybackController } from "../src/services/controller";
import type { ActivePlayerStore } from "../src/services/port";

function storage(): ActivePlayerStore {
  const values = new Map<string, string>();
  return {
    get: async (scope) => values.get(scope),
    set: async (scope, id) => {
      values.set(scope, id);
    },
  };
}
test("All preserves player → artist preview → tracks → albums ordering and searches every kind", () => {
  const { library } = demoData();
  assert.deepEqual(
    searchLibrary(library, "all", "").map((i) => i.kind),
    [
      "player",
      "player",
      "player",
      "artist",
      "artist",
      "artist",
      "track",
      "track",
      "track",
      "track",
      "track",
      "track",
      "album",
      "album",
      "album",
    ],
  );
  assert.equal(searchLibrary(library, "all", "desk")[0]?.kind, "player");
  assert.equal(searchLibrary(library, "all", "north window")[0]?.kind, "artist");
  assert.equal(searchLibrary(library, "tracks", "OPEN WATER")[0]?.name, "Open Water");
  assert.equal(searchLibrary(library, "albums", "Blue Hour")[0]?.kind, "album");
  library.artists.push(...Array.from({ length: 10 }, (_, n) => ({ ...library.artists[0]!, uri: `extra:${n}` })));
  assert.equal(searchLibrary(library, "all", "").filter((i) => i.kind === "artist").length, 5);
});
test("missing, stale and offline active targets fail without choosing another player", () => {
  const { library, queues } = demoData();
  assert.throws(() => requirePlayer(library.players), /Select a player/);
  assert.throws(() => requirePlayer(library.players, "deleted"), /unavailable/);
  assert.throws(() => requirePlayer(library.players, "demo-player-2"), /unavailable/);
  assert.throws(() => requireQueue({ ...library.players[0]!, queueId: "foreign-source" }, queues), /no controllable/);
});
test("repeat cycles off → one → all → off; volume clamps at both boundaries", () => {
  assert.equal(nextRepeat("off"), "one");
  assert.equal(nextRepeat("one"), "all");
  assert.equal(nextRepeat("all"), "off");
  assert.equal(clampVolume(-5), 0);
  assert.equal(clampVolume(105), 100);
  assert.equal(clampVolume(31.7), 32);
  assert.throws(() => clampVolume(Number.NaN));
});
test("selection persists by scope and playback requires an explicit selection", async () => {
  const service = new DemoMusicService();
  const saved = storage();
  const controller = new PlaybackController(service, saved);
  const track = demoData().library.tracks[0]!;
  await assert.rejects(controller.enqueue(track, "play-now"), /Select a player/);
  assert.equal((await service.getQueues())[0]!.entries.length, 0);
  await controller.select("demo-player-1");
  assert.equal((await new PlaybackController(service, saved).active()).id, "demo-player-1");
  assert.equal(await saved.get("live:another-server"), undefined);
  await assert.rejects(controller.select("demo-player-2"), /unavailable/);
  assert.equal((await controller.active()).id, "demo-player-1");
});
test("queue intents preserve duplicate identities, current track, and queue ordering", async () => {
  const service = new DemoMusicService();
  const [a, b, c] = demoData().library.tracks;
  await service.enqueue("demo-player-0", a!, "play-now");
  await service.enqueue("demo-player-0", b!, "add");
  await service.enqueue("demo-player-0", c!, "play-next");
  let queue = (await service.getQueues())[0]!;
  assert.deepEqual(
    queue.entries.map((e) => e.track.uri),
    [a!.uri, c!.uri, b!.uri],
  );
  assert.equal(queue.currentIndex, 0);
  await service.enqueue("demo-player-0", a!, "play-now");
  queue = (await service.getQueues())[0]!;
  assert.equal(queue.currentIndex, 1);
  assert.notEqual(queue.entries[0]!.id, queue.entries[1]!.id);
  await service.removeQueueEntry("demo-player-0", queue.entries[0]!.id);
  assert.equal((await service.getQueues())[0]!.currentIndex, 0);
  await assert.rejects(service.removeQueueEntry("demo-player-0", queue.entries[1]!.id), /Skip the current/);
});
test("demo search pagination and cancellation obey the service contract", async () => {
  const service = new DemoMusicService();
  const first = await service.search({ query: "", view: "tracks", limit: 2 });
  const second = await service.search({ query: "", view: "tracks", limit: 2, cursor: first.nextCursor });
  assert.equal(first.items.length, 2);
  assert.notDeepEqual(first.items, second.items);
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(service.search({ query: "", view: "all", limit: 10 }, abort.signal));
});
