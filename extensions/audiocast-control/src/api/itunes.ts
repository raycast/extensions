import { cache } from "../lib/cache";
import { createLog } from "../lib/debug";
import { lengthToString } from "../lib/lengthToString";
import { get } from "./request";
const log = createLog("itunes");

const API_ROOT = "https://itunes.apple.com";

export interface SearchRecordingResponse {
  resultCount: number;
  results: Recording[];
}

enum RecordingKind {
  BOOK = "book",
  ALBUM = "album",
  COACHED = "coached-audio",
  FEATURE = "feature-movie",
  INTERACTIVE = "interactive-booklet",
  MUSIC = "music-video",
  PDF = "pdf podcast",
  PODCAST = "podcast-episode",
  SOFTWARE = "software-package",
  SONG = "song",
  TV = "tv-episode",
  ARTIST = "artist",
}

interface Recording {
  wrapperType: "track" | "collection" | "artist";
  kind: RecordingKind;
  artistId: number;
  collectionId: number;
  trackId: number;
  artistName: string;
  collectionName: string;
  trackName: string;
  collectionCensoredName: string;
  trackCensoredName: string;
  artistViewUrl: string;
  collectionViewUrl: string;
  trackViewUrl: string;
  previewUrl: string;
  artworkUrl30: string;
  artworkUrl60: string;
  artworkUrl100: string;
  collectionPrice: number;
  trackPrice: number;
  releaseDate: string;
  collectionExplicitness: string;
  trackExplicitness: string;
  discCount: number;
  discNumber: number;
  trackCount: number;
  trackNumber: number;
  trackTimeMillis: number;
  country: string;
  currency: string;
  primaryGenreName: string;
  contentAdvisoryRating: string;
  isStreamable: boolean;
}

export async function searchRecording(
  title: string,
  artist: string,
  album?: string,
  signal?: AbortSignal,
): Promise<RecordingSummary | null> {
  const cachedRecording = cache.getRecording(title, artist, album);

  if (cachedRecording) {
    log.log("found recording in cache");

    return cachedRecording;
  }

  log.log(`searching for recording: "${title}" by ${artist} on "${album}"`);

  const { data: searchResults } = await get<SearchRecordingResponse>(
    `${API_ROOT}/search`,
    {
      term: `${title.toLowerCase()} - ${artist.toLowerCase()}`,
      media: "music",
      entity: "song",
      explicit: "Yes",
      limit: "3",
    },
    {
      headers: {
        "User-Agent": "AudioCastController/1.0 (https://github.com/RomiC/raycast-audiocast-controller)",
      },
      signal,
    },
  );

  if (searchResults.resultCount === 0) {
    log.log("no results found");

    return null;
  }

  log.log(`found ${searchResults.resultCount} results`);

  const recording = searchResults.results[0];
  const recordingSummary = {
    id: recording.trackId.toString(),
    title: recording.trackName,
    artist: recording.artistName,
    album: recording.collectionName,
    length: lengthToString(recording.trackTimeMillis),
    date: new Date(recording.releaseDate).getFullYear().toString(),
    coverArt: recording.artworkUrl100.replace(/100x100bb/, "200x200bb"),
  };

  cache.saveRecording(recordingSummary, title, artist, album);

  return recordingSummary;
}
