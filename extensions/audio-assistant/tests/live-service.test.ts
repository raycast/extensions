import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { LiveMusicService, type CommandClient } from "../src/services/live";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, "fixtures", `${name}.json`), "utf8"));

interface Call {
  command: string;
  args: Record<string, unknown>;
}

class FixtureClient implements CommandClient {
  calls: Call[] = [];
  constructor(private readonly overrides: Record<string, unknown> = {}) {}
  async command(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({ command, args });
    if (command in this.overrides) return this.overrides[command];
    if (command === "info") return fixture("server-info");
    if (command === "auth/me") return fixture("user");
    if (command === "players/all") return fixture("players");
    if (command === "player_queues/all") return fixture("queues");
    if (command === "player_queues/items") return args.queue_id === "whole-home" ? fixture("queue-items") : [];
    if (
      command === "music/tracks/library_items" ||
      command === "music/artists/artist_tracks" ||
      command === "music/albums/album_tracks"
    )
      return fixture("tracks");
    if (command === "music/artists/library_items") return fixture("artists");
    if (command === "music/albums/library_items" || command === "music/artists/artist_albums") return fixture("albums");
    if (command === "music/search")
      return { tracks: fixture("tracks"), artists: fixture("artists"), albums: fixture("albums") };
    return null;
  }
}

function lastCall(client: FixtureClient, command: string): Call | undefined {
  return [...client.calls].reverse().find((call) => call.command === command);
}

const service = (client = new FixtureClient()) => ({
  client,
  service: new LiveMusicService({ serverUrl: "https://music.example.test/proxy/", client }),
});

test("live scope uses server and user IDs without credentials", async () => {
  const { client, service: live } = service();
  assert.equal(await live.getScope(), "live:server-fixture-001:user-fixture-001");
  assert.equal(await live.getScope(), "live:server-fixture-001:user-fixture-001");
  assert.deepEqual(
    client.calls.map((call) => call.command),
    ["info", "auth/me"],
  );
});

test("player decoding filters private endpoints and resolves only an active Music Assistant queue", async () => {
  const { service: live } = service();
  const players = await live.getPlayers();
  assert.deepEqual(
    players.map((player) => player.name),
    ["Living Room", "Kitchen"],
  );
  assert.equal(players[0]?.queueId, "whole-home");
  assert.equal(players[0]?.capabilities.mute, true);
  assert.equal(players[1]?.queueId, undefined);
  assert.equal(players[1]?.capabilities.mute, false);
});

test("live queues preserve server entry IDs and tolerate non-track queue entries", async () => {
  const { client, service: live } = service();
  const queues = await live.getQueues();
  assert.equal(queues[0]?.entries[0]?.id, "entry-1");
  assert.equal(queues[0]?.entries[0]?.track.name, "Open Water");
  assert.equal(queues[0]?.entries[1]?.track.name, "Live Radio Stream");
  assert.equal(queues[0]?.repeat, "all");
  assert.equal(client.calls.filter((call) => call.command === "player_queues/items").length, 2);
});

test("typed and empty searches use verified commands and retain player-first All ordering", async () => {
  const { client, service: live } = service();
  const all = await live.search({ query: "", view: "all", limit: 100 });
  assert.deepEqual(
    all.items.map((item) => item.kind),
    ["player", "player", "artist", "track", "track", "album"],
  );
  const album = all.items.find((item) => item.kind === "album");
  assert.equal(
    album?.artwork,
    "https://music.example.test/proxy/imageproxy/4a986958eb143d884923f7eaf70579d298f84a39b2ca0eb7b855fd12828cd02a?size=512",
  );
  const track = all.items.find((item) => item.kind === "track");
  assert.equal(track?.artwork, "https://images.example.test/cover.jpg");
  const tracks = await live.search({ query: "water", view: "tracks", limit: 25 });
  assert.equal(tracks.items[0]?.kind, "track");
  assert.deepEqual(lastCall(client, "music/search")?.args, {
    search_query: "water",
    media_types: ["track"],
    limit: 25,
  });
});

test("browse uses canonical provider identity", async () => {
  const { client, service: live } = service();
  const artist = (await live.search({ query: "", view: "artists", limit: 10 })).items[0];
  assert.equal(artist?.kind, "artist");
  if (!artist || artist.kind !== "artist") return;
  const result = await live.browse(artist);
  assert.equal(result.tracks.length, 2);
  assert.equal(result.albums.length, 1);
  assert.deepEqual(client.calls.find((call) => call.command === "music/artists/artist_tracks")?.args, {
    item_id: "artist-1",
    provider_instance_id_or_domain: "library",
  });
});

test("queue and player mutations emit exact commands without replay", async () => {
  const { client, service: live } = service();
  const track = (await live.search({ query: "", view: "tracks", limit: 10 })).items[0];
  assert.equal(track?.kind, "track");
  if (!track || track.kind !== "track") return;
  await live.enqueue("living-room", track, "play-next");
  assert.deepEqual(lastCall(client, "player_queues/play_media")?.args, {
    queue_id: "whole-home",
    media: "library://track/track-1",
    option: "next",
  });
  await live.playback("kitchen", "next");
  assert.deepEqual(lastCall(client, "players/cmd/next")?.args, { player_id: "kitchen" });
  await live.setVolume("living-room", 105);
  assert.deepEqual(lastCall(client, "players/cmd/volume_set")?.args, {
    player_id: "living-room",
    volume_level: 100,
  });
  await live.setRepeat("living-room", "one");
  assert.deepEqual(lastCall(client, "player_queues/repeat")?.args, {
    queue_id: "whole-home",
    repeat_mode: "one",
  });
  await assert.rejects(live.setShuffle("kitchen", true), /without a controllable Music Assistant queue/);
  assert.equal(client.calls.filter((call) => call.command === "player_queues/shuffle").length, 0);
});

test("wire failures identify their path instead of casting malformed server data", async () => {
  const client = new FixtureClient({ "players/all": [{ player_id: "broken" }] });
  const live = new LiveMusicService({ serverUrl: "http://music.example.test", client });
  await assert.rejects(live.getPlayers(), /players\[0\]\.name/);
});
