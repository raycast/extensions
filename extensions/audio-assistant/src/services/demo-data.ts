import type { Library, Queue } from "../domain/model";

export function demoData(): { library: Library; queues: Queue[] } {
  const artists = ["North Window", "Soft Circuit", "Evening Maps"].map((name, i) => ({
    kind: "artist" as const,
    name,
    uri: `demo://artist/${i}`,
    provider: "demo",
    itemId: `artist-${i}`,
  }));
  const albums = ["Blue Hour", "Small Signals", "After the Rain"].map((name, i) => ({
    kind: "album" as const,
    name,
    uri: `demo://album/${i}`,
    provider: "demo",
    itemId: `album-${i}`,
    artist: artists[i]!.name,
    artistUris: [artists[i]!.uri],
  }));
  const tracks = ["Open Water", "Side Streets", "Quiet Machines", "Warm Static", "Homeward", "Last Light"].map(
    (name, i) => {
      const album = albums[Math.floor(i / 2)]!;
      return {
        kind: "track" as const,
        name,
        uri: `demo://track/${i}`,
        provider: "demo",
        itemId: `track-${i}`,
        artist: album.artist,
        artistUris: album.artistUris,
        album: album.name,
        albumUri: album.uri,
        duration: 180 + i * 17,
      };
    },
  );
  const players = ["Living Room", "Desk", "Kitchen (Offline)"].map((name, i) => ({
    kind: "player" as const,
    id: `demo-player-${i}`,
    name,
    provider: i === 0 ? "Sendspin (Demo)" : "Demo",
    playerType: "player",
    available: i !== 2,
    state: "idle" as const,
    volume: 35,
    muted: false,
    queueId: `demo-queue-${i}`,
    groupMemberIds: [],
    capabilities: { volume: true, mute: true, grouping: i === 0 },
  }));
  return {
    library: { artists, albums, tracks, players },
    queues: players.map((p) => ({
      id: p.queueId,
      active: true,
      entries: [],
      currentIndex: null,
      repeat: "off",
      shuffle: false,
    })),
  };
}
