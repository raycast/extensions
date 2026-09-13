import { getSpotifyClient } from "../helpers/withSpotifyClient";

// Shared across consumers, including cancelled selections that still have a request in flight.
let active = 0;
const waiting: (() => void)[] = [];
async function request<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  if (active >= 2) {
    await new Promise<void>((resolve, reject) => {
      const resume = () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      const abort = () => {
        const index = waiting.indexOf(resume);
        if (index !== -1) waiting.splice(index, 1);
        signal?.removeEventListener("abort", abort);
        reject(signal?.reason);
      };
      waiting.push(resume);
      signal?.addEventListener("abort", abort, { once: true });
    });
  } else active++;
  try {
    signal?.throwIfAborted();
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

/** Inspect one page at a time; never retain or serialize a playlist's full tracks. */
export async function playlistContainsTrack(playlistId: string, uri: string, signal?: AbortSignal): Promise<boolean> {
  const { spotifyClient } = getSpotifyClient();
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    signal?.throwIfAborted();
    const page = await request(
      () =>
        spotifyClient.getPlaylistsByPlaylistIdTracks(
          playlistId,
          {
            limit: 50,
            offset,
            fields: "items(track(uri,linked_from(uri))),next,offset,limit",
          },
          { signal },
        ),
      signal,
    );
    signal?.throwIfAborted();
    // The generated OpenAPI track union has conflicting discriminators; only these fields are requested.
    const items = page.items as { track?: { uri?: string; linked_from?: { uri?: string } } | null }[] | undefined;
    if (items?.some(({ track }) => track?.uri === uri || track?.linked_from?.uri === uri)) return true;
    hasMore = !!page.next;
    if (!page.next) return false;
    const nextOffset = Number(new URL(page.next).searchParams.get("offset"));
    if (!Number.isInteger(nextOffset) || nextOffset <= offset) throw new Error("Invalid playlist continuation");
    offset = nextOffset;
  }
  return false;
}
