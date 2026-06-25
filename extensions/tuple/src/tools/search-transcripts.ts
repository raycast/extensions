import { stripMatchMarkers } from "../lib/call";
import { searchTranscriptSegments } from "../lib/tuple";

type Input = {
  /**
   * Key words or a name to find in transcripts. All terms must appear in a matching segment,
   * so keep it focused — a few specific words work best. Call again with different terms to broaden.
   */
  query: string;
  /** Only include matches from calls with a participant whose name or email contains this text. */
  participant?: string;
  /** Maximum number of matching segments to return. Defaults to 25. */
  limit?: number;
};

/** Full-text search across all stored call transcripts; returns matching spoken segments. */
export default async function (input: Input) {
  const matches = await searchTranscriptSegments(input.query, {
    limit: input.limit ?? 25,
    participant: input.participant,
  });

  return matches.map((match) => ({
    callId: match.call_id,
    time: match.time,
    speaker: match.speaker,
    text: stripMatchMarkers(match.text || match.snippet).trim(),
  }));
}
