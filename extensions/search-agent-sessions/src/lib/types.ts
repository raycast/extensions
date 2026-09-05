export type Agent = "claude" | "codex";

/**
 * One indexed session. `offset`/`seq` are the incremental-refresh cursor: every
 * byte of `file` below `offset` has already been folded into the corpus, and
 * `seq` is the next message number to hand out. Transcripts are append-only, so
 * a refresh only has to read past `offset`. `size`/`mtimeMs` record the file as
 * it looked at that point, so an in-place rewrite is still detected as stale.
 */
export interface SessionMeta {
  /**
   * Compact corpus key (base36 hash of `file`). Kept short because it prefixes
   * every corpus line, and derived from the path rather than assigned in order
   * so that it names this session permanently — see `corpus.ts`.
   */
  key: string;
  id: string;
  agent: Agent;
  file: string;
  cwd: string;
  project: string;
  title: string;
  size: number;
  mtimeMs: number;
  offset: number;
  seq: number;
}

export interface Manifest {
  version: number;
  sessions: SessionMeta[];
  /**
   * How long corpus.txt was when this manifest was written, and so how much of
   * it the session offsets here account for. `reconcileCorpus` is what squares
   * the two on a later run.
   */
  bytes: number;
}

/** The best line found in a session for the current query. */
export interface Hit {
  text: string;
  /** Which message the line came from, for reading the transcript around it. */
  seq: number;
  /** Distinct query words present in `text`. */
  words: number;
  /** Character span covering every matched word; smaller is tighter. */
  span: number;
}

export interface Row {
  session: SessionMeta;
  hit?: Hit;
}
