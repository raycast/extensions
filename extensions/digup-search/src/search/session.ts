import type { SearchReply } from "../digup/protocol";

export type Filter = "all" | "screenshot" | "image" | "pdf" | "doc" | "audio" | "video" | "code";

export const FILTERS: { value: Filter; title: string }[] = [
  { value: "all", title: "All Files" },
  { value: "screenshot", title: "Screenshots" },
  { value: "image", title: "Images" },
  { value: "pdf", title: "PDFs" },
  { value: "doc", title: "Documents" },
  { value: "audio", title: "Audio" },
  { value: "video", title: "Video" },
  { value: "code", title: "Code" },
];

/** The filter remembered from last time, when it still makes sense. */
export function toFilter(saved: string | undefined, hasCode: boolean): Filter {
  const filter = FILTERS.find((item) => item.value === saved)?.value ?? "all";
  return filter === "code" && !hasCode ? "all" : filter;
}

export interface Query {
  text: string;
  code: boolean;
  kinds?: string[];
}

/** "code: retry with backoff" searches code whatever the filter says, as in DigUp's own panel. */
export function parseQuery(typed: string, filter: Filter): Query {
  const trimmed = typed.trim();
  const prefixed = /^code:/i.test(trimmed);
  const text = prefixed ? trimmed.slice(5).trim() : trimmed;
  if (prefixed || filter === "code") return { text, code: true };
  return filter === "all" ? { text, code: false } : { text, code: false, kinds: [filter] };
}

export interface SearchBackend {
  search(params: { q: string; code: boolean; meaning: boolean; kinds?: string[] }): Promise<SearchReply>;
  embedAhead(q: string, code: boolean): void;
}

/** words: keyword matches while typing; meaning: the full results; wordsOnly: the pause came, without the model. */
export type Phase = "empty" | "words" | "meaning" | "wordsOnly";

export interface SessionState {
  query: Query;
  phase: Phase;
  reply: SearchReply | null;
  loading: boolean;
  error?: string;
  warning?: string;
}

export const EMPTY_STATE: SessionState = {
  query: { text: "", code: false },
  phase: "empty",
  reply: null,
  loading: false,
};

export interface SessionOptions {
  /** How long typing must pause before meaning is searched. */
  pauseMs?: number;
  setTimer?: (run: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/**
 * Search as you type, the way DigUp's own panel does it: every keystroke shows keyword matches at once (the last
 * word as a prefix) and has the text embedded ahead; once typing pauses, the matches by meaning replace them.
 */
export class SearchSession {
  state: SessionState = EMPTY_STATE;
  private generation = 0;
  /** The generation whose meaning results are showing: keyword results that come late don't replace them. */
  private answered = -1;
  private timer: unknown;
  private readonly setTimer: (run: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  constructor(
    private readonly backend: SearchBackend,
    private readonly onChange: (state: SessionState) => void,
    private readonly options: SessionOptions = {},
  ) {
    this.setTimer = options.setTimer ?? ((run, ms) => setTimeout(run, ms));
    this.clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  }

  update(typed: string, filter: Filter): void {
    const query = parseQuery(typed, filter);
    const generation = ++this.generation;
    this.cancelPause();
    if (!query.text) {
      this.set({ query, phase: "empty", reply: null, loading: false });
      return;
    }
    // What was showing stays until the first answer, so the list doesn't blink on every keystroke.
    this.set({ query, phase: this.state.phase, reply: this.state.reply, loading: true });
    const { text: q, code, kinds } = query;
    const params = kinds ? { q, code, kinds } : { q, code };
    this.backend.search({ ...params, meaning: false }).then(
      (reply) => {
        if (generation !== this.generation || this.answered === generation) return;
        this.set({ query, phase: "words", reply, loading: true });
      },
      (error) => this.fail(generation, error),
    );
    this.backend.embedAhead(q, code);
    this.timer = this.setTimer(() => {
      this.timer = undefined;
      this.backend.search({ ...params, meaning: true }).then(
        (reply) => {
          if (generation !== this.generation) return;
          this.answered = generation;
          const state: SessionState = { query, phase: reply.meaning ? "meaning" : "wordsOnly", reply, loading: false };
          if (reply.warning) state.warning = reply.warning;
          this.set(state);
        },
        (error) => this.fail(generation, error),
      );
    }, this.options.pauseMs ?? 120);
  }

  /** Nothing more is reported after this. */
  dispose(): void {
    this.generation += 1;
    this.cancelPause();
  }

  private fail(generation: number, error: unknown): void {
    if (generation !== this.generation) return;
    this.cancelPause();
    this.set({ ...this.state, loading: false, error: error instanceof Error ? error.message : String(error) });
  }

  private cancelPause(): void {
    if (this.timer !== undefined) this.clearTimer(this.timer);
    this.timer = undefined;
  }

  private set(state: SessionState): void {
    this.state = state;
    this.onChange(state);
  }
}
