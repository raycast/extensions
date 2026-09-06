import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { LiveMusicService, type CommandClient } from "../src/services/live";
import { decodeTrack } from "../src/services/wire";

test("related collections retain canonical provider identities and tolerate incomplete mappings", () => {
  const values = fixture("tracks");
  assert.ok(Array.isArray(values));
  const track = decodeTrack(values[0]);
  assert.equal(track.artists?.[0]?.uri, "library://artist/artist-1");
  assert.equal(track.artists?.[0]?.itemId, "artist-1");
  assert.equal(track.albumItem?.provider, "library");
  assert.equal(track.albumItem?.itemId, "album-1");
  const partial = decodeTrack({
    ...values[0],
    artists: [{ name: "Unknown", uri: "incomplete" }],
    album: { name: "Missing identity" },
  });
  assert.deepEqual(partial.artists, []);
  assert.equal(partial.albumItem, undefined);
  assert.equal(partial.artist, "Unknown");
});

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, "fixtures", `${name}.json`), "utf8"));

test("collection cancellation is forwarded to every artist and album request", async () => {
  const signals: (AbortSignal | undefined)[] = [];
  const fixtureClient = new FixtureClient();
  const live = new LiveMusicService({
    serverUrl: "https://music.example.test",
    client: {
      command: async (command, args, signal) => {
        if (command.includes("artist_tracks") || command.includes("artist_albums") || command.includes("album_tracks"))
          signals.push(signal);
        return fixtureClient.command(command, args);
      },
    },
  });
  const page = await live.search({ query: "", view: "all", limit: 100 });
  const artist = page.items.find((item) => item.kind === "artist");
  const album = page.items.find((item) => item.kind === "album");
  assert.ok(artist && album);
  const abort = new AbortController();
  await live.browse(artist, abort.signal);
  await live.browse(album, abort.signal);
  assert.equal(signals.length, 3);
  assert.ok(signals.every((signal) => signal === abort.signal));
});

interface Call {
  command: string;
  args: Record<string, unknown>;
}

test("All discovery retains healthy sources when one library request fails", async () => {
  const fixtureClient = new FixtureClient();
  const live = new LiveMusicService({
    serverUrl: "https://music.example.test",
    client: {
      command: async (command, args) => {
        if (command === "music/albums/library_items") throw new Error("untrusted server body");
        return fixtureClient.command(command, args);
      },
    },
  });
  const page = await live.search({ query: "", view: "all", limit: 100 });
  assert.ok(page.items.some((item) => item.kind === "player"));
  assert.ok(page.items.some((item) => item.kind === "track"));
  assert.deepEqual(page.warnings, ["Albums could not load. Use Refresh to retry."]);
  assert.equal(JSON.stringify(page).includes("untrusted server body"), false);
});

test("All discovery reports total failures instead of presenting an empty library", async () => {
  const live = new LiveMusicService({
    serverUrl: "https://music.example.test",
    client: {
      command: async () => {
        throw new Error("offline");
      },
    },
  });
  await assert.rejects(live.search({ query: "", view: "all", limit: 100 }), /offline/);
});

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

test("All discovery advances media independently without repeating players or artist previews", async () => {
  class PagedClient extends FixtureClient {
    override async command(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
      const result = await super.command(command, args);
      if (command === "music/tracks/library_items" && Number(args.offset) > 0) return [];
      return result;
    }
  }
  const client = new PagedClient();
  const live = new LiveMusicService({ serverUrl: "https://music.example.test", client });
  const first = await live.search({ query: "", view: "all", limit: 2 });
  assert.ok(first.nextCursor);
  const second = await live.search({ query: "", view: "all", limit: 2, cursor: first.nextCursor });
  assert.deepEqual(second.items, []);
  assert.equal(second.nextCursor, undefined);
  assert.equal(client.calls.filter((call) => call.command === "players/all").length, 1);
  assert.equal(client.calls.filter((call) => call.command === "music/artists/library_items").length, 1);
  assert.equal(client.calls.filter((call) => call.command === "music/albums/library_items").length, 1);
  assert.equal(lastCall(client, "music/tracks/library_items")?.args.offset, 2);
  await assert.rejects(
    live.search({ query: "", view: "all", limit: 2, cursor: '{"tracks":-1}' }),
    /Invalid discovery cursor/,
  );
});

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
  await assert.rejects(live.playback("kitchen", "next"), /does not support/);
  await assert.rejects(live.playback("kitchen", "previous"), /does not support/);
  assert.equal(lastCall(client, "players/cmd/next"), undefined);
  await live.playback("living-room", "next");
  assert.deepEqual(lastCall(client, "players/cmd/next")?.args, { player_id: "living-room" });
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
