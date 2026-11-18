import { Track } from "./models";
import { parseResult } from "./parser";

const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

function matchScore(value: string, query: string): number {
  const text = normalize(value);
  if (text === query) return 4;
  if (text.startsWith(query)) return 3;
  if (text.includes(query)) return 2;
  if (query.split(/\s+/).every((word) => text.includes(word))) return 1;
  return 0;
}

/** Keep Music's order for ties and fuzzy matches, prioritizing title, artist, then album. */
export function parseTrackSearchResults(raw: string, search: string): readonly Track[] {
  const tracks = parseResult<Track>()(raw);
  const query = normalize(search);
  if (!query) return tracks;

  const score = (track: Track) =>
    matchScore(track.name, query) * 100 + matchScore(track.artist, query) * 10 + matchScore(track.album, query);

  return tracks
    .map((track) => ({ track, score: score(track) }))
    .sort((a, b) => b.score - a.score)
    .map(({ track }) => track);
}
