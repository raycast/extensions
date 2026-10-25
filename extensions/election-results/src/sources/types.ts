// Shapes every election source normalizes into, so the commands don't care which country they show.

// One election a source can show, as listed before any results are loaded.
export type ElectionSummary = {
  // Unique across sources, such as "br:6258".
  id: string;
  // What the source needs to load the results, such as "ele2026/6258".
  ref: string;
  country: string;
  flag: string;
  title: string;
  // When voting runs, as ISO timestamps.
  pollsOpen: string;
  pollsClose: string;
  timeZone: string;
  timeZoneLabel: string;
};

export type Candidate = {
  // The name on the ballot, and the shortest form of it.
  name: string;
  shortName: string;
  // Legal name, running mate and the source's outcome in English, when the source has them.
  fullName?: string;
  runningMate?: string;
  outcome?: string;
  party: string;
  // Hex color for the party, used for the ballot box and the candidate icons.
  color: string;
  votes: number;
  percent: number;
  elected: boolean;
};

export type ElectionSnapshot = ElectionSummary & {
  reportingPercent: number;
  candidates: Candidate[];
  finished: boolean;
  // When the source last published, as an ISO timestamp.
  updatedAt: string;
  resultsUrl: string;
};
