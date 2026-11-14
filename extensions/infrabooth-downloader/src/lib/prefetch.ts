import { prefetchPlaylistTracks } from "./api";
import type { LibraryPlaylist } from "./mapping";

const PREFETCH_DELAY_MS = 250;
const ITEM_ID_PREFIX = "playlist:";

const prefetched = new Set<number>();
let pendingPrefetch: ReturnType<typeof setTimeout> | undefined;

export function playlistItemId(playlist: LibraryPlaylist): string {
  return `${ITEM_ID_PREFIX}${playlist.id}:${playlist.secretToken ?? ""}`;
}

function parsePlaylistItemId(itemId: string | null): { id: number; secret: string | null } | null {
  if (!itemId?.startsWith(ITEM_ID_PREFIX)) return null;
  const [id, secret] = itemId.slice(ITEM_ID_PREFIX.length).split(":");
  return { id: Number(id), secret: secret || null };
}

// Warms the app's playlist-tracks cache while the user lingers on a row, so opening it is instant.
export function prefetchSelectedPlaylist(itemId: string | null): void {
  clearTimeout(pendingPrefetch);
  const playlist = parsePlaylistItemId(itemId);
  if (!playlist || prefetched.has(playlist.id)) return;
  pendingPrefetch = setTimeout(() => {
    prefetched.add(playlist.id);
    prefetchPlaylistTracks(playlist.id, playlist.secret).catch((error) => {
      prefetched.delete(playlist.id);
      console.error(`Prefetch failed for playlist ${playlist.id}:`, error);
    });
  }, PREFETCH_DELAY_MS);
}
