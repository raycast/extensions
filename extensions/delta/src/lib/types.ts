/** Shape of one entry in `delta thread list --json`. */
export interface Thread {
  id: string;
  name: string;
  archived: boolean;
  join_id: string | null;
  status: string | null;
  created_at_utc: string;
  index: number;
  generated_title: string | null;
  summary: string | null;
  keywords: string[];
  intents: string[];
}

/** Shape of one entry in `delta org list --json`. */
export interface Organization {
  id: string;
  name: string;
  current: boolean;
}

export type Visibility = "private" | "organization";

/** A thread Delta cited in a `thread query` answer. */
export interface QuerySource {
  id: string;
  name: string;
}

export interface QueryResult {
  answer: string;
  sources: QuerySource[];
}

/** Result of `delta update --check`. */
export interface DeltaUpdateCheck {
  /** `up_to_date` when nothing is newer; other values mean an update exists or the check failed. */
  status: string;
  currentVersion: string;
  latestVersion: string;
  canInstall: boolean;
}

/** One entry of `delta thread show --format summarize`. */
export interface ThreadSummary {
  id: string;
  name: string;
  /** Compact transcript of the conversation, without tool output. */
  transcript: string;
  /** Message metadata in order; the text itself is in `transcript`. */
  messages: { number: number; role: string; created_at_utc: string }[];
  generated_title: string | null;
  summary: string | null;
  keywords: string[];
  intents: string[];
}
