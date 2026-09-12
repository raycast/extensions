import type { AudioPlayer } from "./audio-player";
import { playChunkSequence } from "./chunk-playback-engine";

export interface PipelinedPlaybackCallbacks {
  onChunkReady?: (index: number, total: number) => Promise<void> | void;
  onFirstAudioReady?: () => Promise<void> | void;
}

export class ChunkSynthesisError extends Error {
  readonly index: number;
  readonly total: number;
  readonly cause: unknown;

  constructor(index: number, total: number, cause: unknown) {
    const base = cause instanceof Error ? cause.message : String(cause);
    super(total > 1 ? `Chunk ${index + 1}/${total} failed: ${base}` : base);
    this.name = "ChunkSynthesisError";
    this.index = index;
    this.total = total;
    this.cause = cause;
  }
}

/**
 * Per-provider bindings supplied by the thin wrapper modules. Keeps the
 * synthesis API and stop-signal source out of the shared loop so OpenAI and
 * MiMo (and any future provider) share one implementation.
 */
export interface PipelineProvider<O> {
  synthesize: (text: string, options: O, signal: AbortSignal) => Promise<string>;
  hasStopRequest: () => Promise<boolean>;
}

type AudioOptions = { format: string; playbackRate: number };
const STOP_POLL_INTERVAL_MS = 100;

/**
 * Play chunks sequentially while synthesizing the next chunk during current
 * playback. Delegates to the shared chunk-playback engine; the hooks below
 * reproduce this path's original behavior exactly (no loop-top stop check;
 * stop is checked before the synthesis outcome, again before playback, and
 * after playback; a real synthesis error throws ChunkSynthesisError unless
 * playback was already stopped; constant options so the prefetch is always
 * reused).
 */
export async function playChunksWithLookahead<O extends AudioOptions>(
  chunks: string[],
  options: O,
  player: AudioPlayer,
  provider: PipelineProvider<O>,
  callbacks: PipelinedPlaybackCallbacks = {},
): Promise<void> {
  if (chunks.length === 0) return;

  await playChunkSequence<O>({
    total: chunks.length,
    startIndex: 0,
    player,
    shouldStop: async () => {
      if (player.isStopped()) return true;
      if (await provider.hasStopRequest()) {
        player.stopPlayback();
        return true;
      }
      return false;
    },
    stopCheckAtLoopTop: false,
    stopCheckBeforeOutcome: true,
    stopCheckAfterAdvance: false,
    resolveOptions: () => options,
    optionsKey: () => "",
    startJob: (index) => startPipelineSynthesisJob(chunks[index], options, player, provider),
    errorIsStop: () => player.isStopped(),
    onError: (index, total, cause) => {
      throw new ChunkSynthesisError(index, total, cause);
    },
    onPhase: async (phase, index, total) => {
      if (phase === "playing") {
        await callbacks.onChunkReady?.(index, total);
      }
    },
    onFirstAudio: () => callbacks.onFirstAudioReady?.(),
    play: (audio) => player.playAudio(audio, options.format, options.playbackRate),
  });
}

export function createPipelinedPlayback<O extends AudioOptions>(provider: PipelineProvider<O>) {
  return (
    chunks: string[],
    options: O,
    player: AudioPlayer,
    callbacks: PipelinedPlaybackCallbacks = {},
  ): Promise<void> => playChunksWithLookahead(chunks, options, player, provider, callbacks);
}

function startPipelineSynthesisJob<O extends AudioOptions>(
  text: string,
  options: O,
  player: AudioPlayer,
  provider: PipelineProvider<O>,
) {
  const controller = new AbortController();
  let stoppedByRequest = false;
  let checkingStop = false;

  const abortFromPlayer = () => controller.abort();
  if (player.signal.aborted) {
    controller.abort();
  } else {
    player.signal.addEventListener("abort", abortFromPlayer, { once: true });
  }

  const stopPoll = setInterval(() => {
    if (checkingStop || controller.signal.aborted) return;
    checkingStop = true;
    provider
      .hasStopRequest()
      .then((stopRequested) => {
        if (!stopRequested || controller.signal.aborted) return;
        stoppedByRequest = true;
        player.stopPlayback();
        controller.abort();
      })
      .catch(() => undefined)
      .finally(() => {
        checkingStop = false;
      });
  }, STOP_POLL_INTERVAL_MS);
  stopPoll.unref?.();

  return {
    outcome: provider
      .synthesize(text, options, controller.signal)
      .then(
        (audio) => ({ kind: "audio", audio }) as const,
        (cause) =>
          controller.signal.aborted && (player.isStopped() || stoppedByRequest)
            ? ({ kind: "stopped" } as const)
            : ({ kind: "error", cause } as const),
      )
      .finally(() => {
        clearInterval(stopPoll);
        player.signal.removeEventListener("abort", abortFromPlayer);
      }),
    cancel: () => controller.abort(),
  };
}
