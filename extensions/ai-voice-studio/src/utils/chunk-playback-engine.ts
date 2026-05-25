import type { AudioPlayer } from "./audio-player";

// Shared chunk playback loop for Qwen-TTS, MiMo, and OpenAI. Each provider
// supplies hooks for its own stop and playback policies while reusing the same
// prefetch/cancel sequencing.

export type ChunkOutcome = { kind: "audio"; audio: string } | { kind: "stopped" } | { kind: "error"; cause: unknown };

export interface ChunkJob {
  outcome: Promise<ChunkOutcome>;
  cancel: () => void;
}

export interface ChunkPlaybackHooks<O> {
  total: number;
  startIndex: number;
  player: AudioPlayer;

  /** Primary stop signal, checked after synthesis and after playback. */
  shouldStop: () => boolean | Promise<boolean>;
  /** Whether to check the stop signal at the top of every iteration. */
  stopCheckAtLoopTop: boolean;
  /** pipeline checks stop before inspecting the synthesis outcome; runner does not. */
  stopCheckBeforeOutcome: boolean;
  /** Optional extra stop check after a chunk has advanced. */
  stopCheckAfterAdvance: boolean;
  /** Stop signal for the post-advance check. */
  stopAfterAdvance?: () => boolean | Promise<boolean>;

  /** Per-chunk options. */
  resolveOptions: (index: number) => O | Promise<O>;
  /** Prefetch reuse key: reuse the lookahead iff index and key match. */
  optionsKey: (options: O) => string;
  startJob: (index: number, options: O) => ChunkJob;

  /** True for a synthesis error that should be treated as a graceful stop. */
  errorIsStop: (cause: unknown) => boolean;
  /** Throw the provider-appropriate error for a real synthesis failure. */
  onError: (index: number, total: number, cause: unknown) => never;

  onPhase: (phase: "synthesizing" | "playing", index: number, total: number, options: O) => Promise<void> | void;
  /** Called once, right after the first chunk's "playing" phase (pipeline). */
  onFirstAudio?: () => Promise<void> | void;
  play: (audio: string, options: O) => Promise<void>;
  afterPlay?: (index: number, options: O) => Promise<void> | void;
  afterAdvance?: (index: number) => Promise<void> | void;
}

interface ActivePrefetch {
  index: number;
  key: string;
  job: ChunkJob;
}

export async function playChunkSequence<O>(hooks: ChunkPlaybackHooks<O>): Promise<void> {
  let prefetch: ActivePrefetch | null = null;

  try {
    for (let i = hooks.startIndex; i < hooks.total; i++) {
      if (hooks.stopCheckAtLoopTop && (await hooks.shouldStop())) break;

      const options = await hooks.resolveOptions(i);
      const key = hooks.optionsKey(options);

      const job = prefetch && prefetch.index === i && prefetch.key === key ? prefetch.job : hooks.startJob(i, options);
      if (prefetch && (prefetch.index !== i || prefetch.key !== key)) {
        prefetch.job.cancel();
      }
      prefetch = null;

      await hooks.onPhase("synthesizing", i, hooks.total, options);

      const outcome = await job.outcome;

      if (hooks.stopCheckBeforeOutcome && (await hooks.shouldStop())) break;

      if (outcome.kind === "error") {
        if (hooks.errorIsStop(outcome.cause)) break;
        hooks.onError(i, hooks.total, outcome.cause);
      }
      if (outcome.kind === "stopped") break;
      const audio = outcome.audio;

      if (await hooks.shouldStop()) break;

      if (i + 1 < hooks.total) {
        const nextOptions = await hooks.resolveOptions(i + 1);
        const nextJob = hooks.startJob(i + 1, nextOptions);
        nextJob.outcome.catch(() => undefined);
        prefetch = { index: i + 1, key: hooks.optionsKey(nextOptions), job: nextJob };
      }

      await hooks.onPhase("playing", i, hooks.total, options);
      if (i === hooks.startIndex) {
        await hooks.onFirstAudio?.();
      }

      await hooks.play(audio, options);
      await hooks.afterPlay?.(i, options);

      if (await hooks.shouldStop()) break;

      await hooks.afterAdvance?.(i);

      if (hooks.stopCheckAfterAdvance) {
        const stopper = hooks.stopAfterAdvance ?? hooks.shouldStop;
        if (await stopper()) break;
      }
    }
  } finally {
    prefetch?.job.cancel();
  }
}
