import { useEffect, useRef, useState } from "react";
import { Sentence, PARAGRAPH_BREAK } from "../rsvp/tokenize";
import { cleanupOrphans, cleanupTempDir, makeTempDir, synthesizeChunk, SynthesizedChunk } from "../tts/synthesize";
import { rsvpLog } from "../utils/rsvp-log";

let orphansSwept = false;

export interface SynthesisState {
  audioByIndex: Map<number, SynthesizedChunk>;
  ready: number;
  total: number;
  isComplete: boolean;
  error: string | null;
}

export interface SynthesisOptions {
  voice: string;
  wpm: number;
  enabled: boolean;
  concurrency?: number;
}

export function useAudioSynthesis(sentences: Sentence[], opts: SynthesisOptions): SynthesisState {
  const [state, setState] = useState<SynthesisState>({
    audioByIndex: new Map(),
    ready: 0,
    total: 0,
    isComplete: !opts.enabled,
    error: null,
  });

  const cancelRef = useRef(false);
  const dirRef = useRef<string | null>(null);

  useEffect(() => {
    cancelRef.current = false;
    if (dirRef.current) {
      cleanupTempDir(dirRef.current).catch(() => undefined);
      dirRef.current = null;
    }

    if (!opts.enabled || sentences.length === 0) {
      setState({ audioByIndex: new Map(), ready: 0, total: 0, isComplete: true, error: null });
      return;
    }

    const speakable: Array<{ sentence: Sentence; index: number }> = [];
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      if (s.text === PARAGRAPH_BREAK) continue;
      if (s.image) continue;
      speakable.push({ sentence: s, index: i });
    }

    setState({
      audioByIndex: new Map(),
      ready: 0,
      total: speakable.length,
      isComplete: false,
      error: null,
    });

    const concurrency = Math.max(1, Math.min(4, opts.concurrency ?? 3));
    let cursor = 0;
    const acc = new Map<number, SynthesizedChunk>();

    (async () => {
      if (!orphansSwept) {
        orphansSwept = true;
        cleanupOrphans()
          .then((n) => {
            if (n > 0) rsvpLog.debug(`swept ${n} orphaned temp dir(s) older than 1h`);
          })
          .catch(() => undefined);
      }

      let dir: string;
      try {
        dir = await makeTempDir();
        dirRef.current = dir;
      } catch (e) {
        rsvpLog.error("makeTempDir failed", e);
        setState((s) => ({ ...s, error: String(e), isComplete: true }));
        return;
      }

      const t0 = Date.now();
      rsvpLog.debug(`synthesis start: ${speakable.length} chunks, concurrency=${concurrency}`);

      const worker = async () => {
        while (!cancelRef.current) {
          const idx = cursor++;
          if (idx >= speakable.length) return;
          const { sentence, index } = speakable[idx];
          try {
            const synthStart = Date.now();
            const result = await synthesizeChunk(sentence.text, {
              voice: opts.voice,
              wpm: opts.wpm,
              dir,
              index,
            });
            if (cancelRef.current) return;
            acc.set(index, result);
            rsvpLog.debug(
              `synth chunk ${index} words=${sentence.words.length} audio=${result.durationMs}ms synth=${Date.now() - synthStart}ms`,
            );
            setState((prev) => ({
              ...prev,
              audioByIndex: new Map(acc),
              ready: acc.size,
            }));
          } catch (e) {
            rsvpLog.error(`synth chunk ${index} failed`, e);
          }
        }
      };

      await Promise.all(Array.from({ length: concurrency }, () => worker()));
      if (!cancelRef.current) {
        rsvpLog.debug(`synthesis complete: ${acc.size}/${speakable.length} chunks in ${Date.now() - t0}ms`);
        setState((prev) => ({ ...prev, isComplete: true }));
      }
    })();

    return () => {
      cancelRef.current = true;
      if (dirRef.current) {
        const dir = dirRef.current;
        dirRef.current = null;
        cleanupTempDir(dir).catch(() => undefined);
      }
    };
  }, [sentences, opts.voice, opts.wpm, opts.enabled, opts.concurrency]);

  return state;
}
