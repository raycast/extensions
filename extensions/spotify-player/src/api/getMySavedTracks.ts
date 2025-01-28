import { getSpotifyClient } from "../helpers/withSpotifyClient";
import { getErrorMessage } from "../helpers/getError";
import { SavedTrackObject } from "../helpers/spotify.api";

export interface MinimalTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string }[];
  };
  uri: string;
  duration_ms: number;
}

interface GetMySavedTracksProps {
  limit?: number;
  offset?: number;
  fetchAll?: boolean;
  onProgress?: (progress: number) => void;
}

interface SpotifyResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

interface SpotifyClient {
  getMeTracks: (options: { limit: number; offset: number }) => Promise<unknown>;
}

// Constants
const MAX_TRACKS_PER_REQUEST = 50;
const BATCH_SIZE = 5; // Number of parallel requests per batch
const RATE_LIMIT_PER_REQUEST = 100; // 100ms per request
const RATE_LIMIT_DELAY = BATCH_SIZE * RATE_LIMIT_PER_REQUEST; // 500ms per batch
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Type guard for Spotify response
const isValidResponse = (response: unknown): response is SpotifyResponse<SavedTrackObject> => {
  if (!response || typeof response !== "object") return false;

  const typedResponse = response as Partial<SpotifyResponse<SavedTrackObject>>;
  return (
    Array.isArray(typedResponse.items) &&
    typeof typedResponse.total === "number" &&
    typedResponse.items !== undefined &&
    typedResponse.total !== undefined
  );
};

// Helper function to split array into chunks
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Retry helper
const withRetry = async <T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || (error instanceof Error && error.message.includes("429"))) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

// Track transformation helper
const transformTrack = (item: SavedTrackObject): MinimalTrack => ({
  id: item.track?.id ?? "",
  name: item.track?.name ?? "",
  artists: item.track?.artists?.map((artist) => ({ name: artist.name ?? "" })) ?? [],
  album: {
    id: item.track?.album?.id ?? "",
    name: item.track?.album?.name ?? "",
    images: item.track?.album?.images?.map((image) => ({ url: image.url ?? "" })) ?? [],
  },
  uri: item.track?.uri ?? "",
  duration_ms: item.track?.duration_ms ?? 0,
});

// Batch processing helper
const processBatch = async (
  spotifyClient: SpotifyClient,
  offsetBatch: number[],
  currentTotal: number,
  processedSoFar: number,
  onProgress?: (progress: number) => void,
): Promise<MinimalTrack[]> => {
  const batchResults = await Promise.all(
    offsetBatch.map((offset) =>
      withRetry(() =>
        spotifyClient.getMeTracks({ limit: MAX_TRACKS_PER_REQUEST, offset }).then((response: unknown) => {
          if (!isValidResponse(response)) {
            throw new Error("Invalid response from Spotify API");
          }
          return response.items.map(transformTrack);
        }),
      ),
    ),
  );

  const newTracks = batchResults.flat();
  const newProcessedTotal = processedSoFar + newTracks.length;
  const progress = Math.round((newProcessedTotal / currentTotal) * 100);
  onProgress?.(progress);

  return newTracks;
};

// Memory-efficient array building
const buildTracksArray = (firstBatch: MinimalTrack[], batchResults: MinimalTrack[][]): MinimalTrack[] => {
  const totalLength = firstBatch.length + batchResults.reduce((acc, batch) => acc + batch.length, 0);
  const result = new Array<MinimalTrack>(totalLength);

  result.splice(0, firstBatch.length, ...firstBatch);

  let offset = firstBatch.length;
  for (const batch of batchResults) {
    result.splice(offset, batch.length, ...batch);
    offset += batch.length;
  }

  return result;
};

export async function getMySavedTracks({ offset = 0, fetchAll = false, onProgress }: GetMySavedTracksProps) {
  const { spotifyClient } = getSpotifyClient();

  try {
    // Get initial batch and total
    const firstBatch = await withRetry(() => spotifyClient.getMeTracks({ limit: MAX_TRACKS_PER_REQUEST, offset }));
    if (!isValidResponse(firstBatch)) {
      throw new Error("Invalid response from Spotify API");
    }

    const total = firstBatch.total;
    let tracks = firstBatch.items.map(transformTrack);

    if (fetchAll && total > MAX_TRACKS_PER_REQUEST) {
      // Calculate number of additional requests needed
      const remainingTracks = total - tracks.length;
      const totalRequests = Math.ceil(remainingTracks / MAX_TRACKS_PER_REQUEST);

      // Create array of all offsets
      const allOffsets = Array.from({ length: totalRequests }, (_, i) => (i + 1) * MAX_TRACKS_PER_REQUEST);

      // Split offsets into batches for parallel processing
      const offsetBatches = chunk(allOffsets, BATCH_SIZE);

      // Process each batch in sequence
      const batchResults: MinimalTrack[][] = [];
      for (const [batchIndex, offsetBatch] of offsetBatches.entries()) {
        const batchTracks = await processBatch(
          spotifyClient,
          offsetBatch,
          total,
          tracks.length + batchResults.flat().length,
          onProgress,
        );
        batchResults.push(batchTracks);

        // Add delay between batches to avoid rate limits
        if (batchIndex < offsetBatches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }

      // Build final tracks array efficiently
      tracks = buildTracksArray(tracks, batchResults);
    }

    return {
      items: tracks,
      total,
      hasMore: tracks.length < total,
    };
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("getMySavedTracks.ts Error:", error);
    throw new Error(error);
  }
}
