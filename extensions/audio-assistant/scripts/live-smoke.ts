import { HttpCommandClient, normalizeServerUrl } from "../src/services/http-client";
import { LiveMusicService } from "../src/services/live";

const token = process.env.AUDIO_ASSISTANT_TOKEN;
const serverUrl = process.env.AUDIO_ASSISTANT_URL;
if (!token || !serverUrl) throw new Error("Set AUDIO_ASSISTANT_URL and AUDIO_ASSISTANT_TOKEN.");

async function main() {
  const tokenShape = token.split(".").map((segment) => segment.length);
  const authProbe = await fetch(`${normalizeServerUrl(serverUrl)}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  console.log(JSON.stringify({ authMeStatus: authProbe.status, tokenShape }));
  if (!authProbe.ok) {
    process.exitCode = 1;
    return;
  }

  const client = new HttpCommandClient(serverUrl, token);
  const service = new LiveMusicService({ serverUrl, client });
  const info = (await client.command("info")) as Record<string, unknown>;
  const players = await service.getPlayers();
  const [all, tracks, artists, albums, queues] = await Promise.all([
    service.search({ view: "all", query: "", limit: 100 }),
    service.search({ view: "tracks", query: "", limit: 20 }),
    service.search({ view: "artists", query: "", limit: 20 }),
    service.search({ view: "albums", query: "", limit: 20 }),
    service.getQueues(),
  ]);
  const firstTrack = tracks.items.find((item) => item.kind === "track");
  const firstArtist = artists.items.find((item) => item.kind === "artist");
  const firstAlbum = albums.items.find((item) => item.kind === "album");
  const [typedSearch, artistBrowse, albumBrowse] = await Promise.all([
    firstTrack
      ? service.search({ view: "all", query: firstTrack.name.slice(0, 12), limit: 25 })
      : Promise.resolve({ items: [] }),
    firstArtist ? service.browse(firstArtist) : Promise.resolve({ tracks: [], albums: [] }),
    firstAlbum ? service.browse(firstAlbum) : Promise.resolve({ tracks: [] }),
  ]);

  console.log(
    JSON.stringify(
      {
        serverVersion: info.server_version ?? info.version ?? "unknown",
        schemaVersion: info.schema_version ?? "unknown",
        scopeResolved: Boolean(await service.getScope()),
        players: players.map((player) => ({
          available: player.available,
          powered: player.powered,
          provider: player.provider,
          state: player.state,
          hasQueue: Boolean(player.queueId),
          volume: player.capabilities.volume,
          mute: player.capabilities.mute,
          grouping: player.capabilities.grouping,
        })),
        resultCounts: {
          all: all.items.length,
          tracks: tracks.items.length,
          artists: artists.items.length,
          albums: albums.items.length,
          tracksWithArtwork: tracks.items.filter((item) => item.kind === "track" && item.artwork).length,
          artistsWithArtwork: artists.items.filter((item) => item.kind === "artist" && item.artwork).length,
          albumsWithArtwork: albums.items.filter((item) => item.kind === "album" && item.artwork).length,
          queues: queues.length,
          typedSearch: typedSearch.items.length,
          artistTracks: artistBrowse.tracks.length,
          artistAlbums: artistBrowse.albums?.length ?? 0,
          albumTracks: albumBrowse.tracks.length,
        },
        pagination: {
          tracks: Boolean(tracks.nextCursor),
          artists: Boolean(artists.nextCursor),
          albums: Boolean(albums.nextCursor),
        },
      },
      null,
      2,
    ),
  );
}

void main();
