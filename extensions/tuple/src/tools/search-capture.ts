import { searchCapture, stripMatchMarkers } from "../lib/tuple";

type Input = {
  /**
   * Text to find in captured conversations and shared content. Core owns matching semantics.
   */
  query: string;
  /** Only include matches from calls with a participant whose name or email contains this text. */
  participant?: string;
  /** Maximum number of matching segments to return. Defaults to 25. */
  limit?: number;
};

/** Search stored Capture occurrences, including shared content. */
export default async function (input: Input) {
  const matches = await searchCapture(input.query, {
    limit: input.limit ?? 25,
    participant: input.participant,
  });

  return matches.map((match) => ({
    callId: match.call_id,
    time: match.time,
    kind: match.kind,
    speaker: match.speaker,
    appName: match.app_name,
    url: match.url,
    text: stripMatchMarkers(match.text || match.snippet).trim(),
  }));
}
