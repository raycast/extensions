import { useEffect, useRef, useState } from "react";
import { Sentence, PARAGRAPH_BREAK } from "../rsvp/tokenize";
import { ParagraphPause, baseDelayMs, wordDelayMs } from "../rsvp/timing";
import { playFile, PlayHandle } from "../tts/afplay-runner";
import { SynthesizedChunk } from "../tts/synthesize";
import { rsvpLog } from "../utils/rsvp-log";

const CHUNK_GAP_BASE_DELAYS = 2;
const IMAGE_PAUSE_MS = 2500;

export interface RSVPPlayerOptions {
  sentences: Sentence[];
  words: string[];
  audioByIndex: Map<number, SynthesizedChunk>;
  initialWpm: number;
  initialTtsEnabled: boolean;
  paragraphPause: ParagraphPause;
}

export interface RSVPPlayerState {
  globalWordIndex: number;
  sentenceIndex: number;
  isPlaying: boolean;
  isFinished: boolean;
  wpm: number;
  ttsEnabled: boolean;
}

export interface RSVPPlayerActions {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  setWpm: (wpm: number) => void;
  setTtsEnabled: (enabled: boolean) => void;
  nextSentence: () => void;
  prevSentence: () => void;
}

function sleep(ms: number, ctrl: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) return resolve();
    let id: ReturnType<typeof setTimeout> | null = null;
    const check = setInterval(() => {
      if (ctrl.cancelled) {
        if (id) clearTimeout(id);
        clearInterval(check);
        resolve();
      }
    }, 25);
    id = setTimeout(() => {
      clearInterval(check);
      resolve();
    }, ms);
  });
}

function buildSentenceLookup(sentences: Sentence[], totalWords: number): Int32Array {
  const lookup = new Int32Array(totalWords);
  for (let s = 0; s < sentences.length; s++) {
    const { startIndex, endIndex } = sentences[s];
    for (let w = startIndex; w <= endIndex; w++) lookup[w] = s;
  }
  return lookup;
}

export function useRSVPPlayer(opts: RSVPPlayerOptions): RSVPPlayerState & RSVPPlayerActions {
  const { sentences, words, audioByIndex } = opts;
  const sentenceForWord = useRef(buildSentenceLookup(sentences, words.length)).current;

  const [globalWordIndex, setGlobalWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpmState] = useState(opts.initialWpm);
  const [ttsEnabled, setTtsEnabledState] = useState(opts.initialTtsEnabled);

  const positionRef = useRef(0);
  const audioRef = useRef(audioByIndex);
  audioRef.current = audioByIndex;
  const settingsRef = useRef({ wpm, ttsEnabled, paragraphPause: opts.paragraphPause });
  settingsRef.current = { wpm, ttsEnabled, paragraphPause: opts.paragraphPause };

  const playHandleRef = useRef<PlayHandle | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    if (positionRef.current >= words.length) {
      setIsPlaying(false);
      return;
    }

    const ctrl = { cancelled: false };
    const sessionStart = Date.now();
    rsvpLog.debug(
      `play start wpm=${settingsRef.current.wpm} tts=${settingsRef.current.ttsEnabled} prerendered=${audioRef.current.size}/${sentences.length}`,
    );

    (async () => {
      while (!ctrl.cancelled && positionRef.current < words.length) {
        const startWord = positionRef.current;
        const sIdx = sentenceForWord[startWord] ?? 0;
        const sentence = sentences[sIdx];
        if (!sentence) break;

        const isParagraphMarker = sentence.text === PARAGRAPH_BREAK;
        const isImage = Boolean(sentence.image);
        const { ttsEnabled: ttsOn } = settingsRef.current;
        const chunkWordCount = sentence.endIndex - startWord + 1;

        const audio = !isParagraphMarker && !isImage && ttsOn ? audioRef.current.get(sIdx) : undefined;

        let playHandle: PlayHandle | null = null;
        let perWordDelay: number | null = null;
        const playStart = Date.now();

        if (audio) {
          const offset = startWord - sentence.startIndex;
          const fractionRemaining = chunkWordCount / sentence.words.length;
          const audioDurationMs = Math.max(150, Math.round(audio.durationMs * fractionRemaining));
          if (offset === 0) {
            // Play the full AIFF — don't truncate, since any trim risks cutting
            // the last word's real audio. The visual will pause on the final
            // word for any trailing silence, then we await audio completion.
            playHandle = playFile(audio.path);
            playHandleRef.current = playHandle;
            playHandle.done.catch(() => undefined);
          }
          perWordDelay = audioDurationMs / chunkWordCount;
          rsvpLog.debug(
            `chunk ${sIdx + 1}/${sentences.length} words=${chunkWordCount} audio=${audio.durationMs}ms perWord=${perWordDelay.toFixed(0)}ms ${offset > 0 ? "(resumed mid-chunk; visual-only)" : ""}`,
          );
        } else if (isImage) {
          perWordDelay = IMAGE_PAUSE_MS;
          rsvpLog.debug(`chunk ${sIdx + 1}/${sentences.length} IMAGE url=${sentence.image} pause=${IMAGE_PAUSE_MS}ms`);
        } else if (!isParagraphMarker) {
          rsvpLog.debug(
            `chunk ${sIdx + 1}/${sentences.length} words=${chunkWordCount} audio=pending/disabled — visual-only`,
          );
        }

        const visualStart = Date.now();
        for (let w = startWord; w <= sentence.endIndex && !ctrl.cancelled; w++) {
          positionRef.current = w;
          setGlobalWordIndex(w);
          const delay =
            perWordDelay !== null
              ? perWordDelay
              : wordDelayMs(words[w], {
                  wpm: settingsRef.current.wpm,
                  paragraphPause: settingsRef.current.paragraphPause,
                });
          await sleep(delay, ctrl);
        }
        const visualMs = Date.now() - visualStart;

        if (ctrl.cancelled) {
          if (playHandle) playHandle.cancel();
          return;
        }

        if (playHandle) {
          await playHandle.done.catch(() => undefined);
          const audioMs = Date.now() - playStart;
          rsvpLog.debug(`chunk ${sIdx + 1} done visual=${visualMs}ms audio=${audioMs}ms drift=${audioMs - visualMs}ms`);
          playHandleRef.current = null;
        }

        positionRef.current = sentence.endIndex + 1;
        setGlobalWordIndex(positionRef.current);

        // Inter-chunk gap = 2× per-word delay at current WPM. Skip after paragraph
        // breaks (paragraphPause already governs that), after images (their own pause
        // already happened), and after the final chunk.
        if (!isParagraphMarker && !isImage && positionRef.current < words.length && !ctrl.cancelled) {
          const gap = CHUNK_GAP_BASE_DELAYS * baseDelayMs(settingsRef.current.wpm);
          await sleep(gap, ctrl);
        }
      }

      if (!ctrl.cancelled && positionRef.current >= words.length) {
        rsvpLog.debug(`play end total=${Date.now() - sessionStart}ms`);
        setIsPlaying(false);
      }
    })();

    return () => {
      ctrl.cancelled = true;
      if (playHandleRef.current) {
        playHandleRef.current.cancel();
        playHandleRef.current = null;
      }
    };
  }, [isPlaying, sentences, words, sentenceForWord]);

  const stopAudio = () => {
    if (playHandleRef.current) {
      playHandleRef.current.cancel();
      playHandleRef.current = null;
    }
  };

  return {
    globalWordIndex,
    sentenceIndex: sentenceForWord[Math.min(globalWordIndex, words.length - 1)] ?? 0,
    isPlaying,
    isFinished: globalWordIndex >= words.length && words.length > 0,
    wpm,
    ttsEnabled,

    play: () => {
      if (positionRef.current >= words.length) {
        positionRef.current = 0;
        setGlobalWordIndex(0);
      }
      setIsPlaying(true);
    },
    pause: () => {
      stopAudio();
      setIsPlaying(false);
    },
    toggle: () => {
      if (isPlaying) {
        stopAudio();
        setIsPlaying(false);
      } else {
        if (positionRef.current >= words.length) {
          positionRef.current = 0;
          setGlobalWordIndex(0);
        }
        setIsPlaying(true);
      }
    },
    restart: () => {
      stopAudio();
      setIsPlaying(false);
      positionRef.current = 0;
      setGlobalWordIndex(0);
    },
    setWpm: (next) => setWpmState(Math.max(80, Math.min(800, next))),
    setTtsEnabled: (e) => {
      stopAudio();
      setTtsEnabledState(e);
    },
    nextSentence: () => {
      stopAudio();
      const sIdx = sentenceForWord[Math.min(positionRef.current, words.length - 1)] ?? 0;
      const next = sentences[sIdx + 1];
      const target = next ? next.startIndex : words.length;
      positionRef.current = target;
      setGlobalWordIndex(target);
    },
    prevSentence: () => {
      stopAudio();
      const sIdx = sentenceForWord[Math.min(positionRef.current, words.length - 1)] ?? 0;
      const prev = sentences[Math.max(0, sIdx - 1)];
      const target = prev ? prev.startIndex : 0;
      positionRef.current = target;
      setGlobalWordIndex(target);
    },
  };
}

export { baseDelayMs };
