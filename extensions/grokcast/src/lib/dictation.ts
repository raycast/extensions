// Dictation: record until told to stop while xAI transcribes live, then keep the
// text in the history. When live transcription stops, the whole recording is sent
// instead. No Raycast imports, so tests run it under plain Node.

import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { DictationHistory } from "./history.ts"
import { LiveTranscriber, type LiveTranscript } from "./live-transcriber.ts"
import { durationOfBytes, joinChunks, levelDbfs, Recorder } from "./recorder.ts"
import { Transcriber } from "./transcriber.ts"

/** Recording stops on its own after this long and is transcribed. */
export const MAX_DICTATION = Duration.minutes(5)

/** A recording shorter than this is not sent to xAI. */
export const MIN_DICTATION_SECONDS = 0.3

/** After recording stops, how long to wait for the live text before sending the whole recording. */
export const LIVE_FINISH_TIMEOUT = Duration.seconds(10)

export const AfterDictation = Schema.Literals(["paste", "copy"])

export type AfterDictation = typeof AfterDictation.Type

export class DictationSettings extends Schema.Class<DictationSettings>("DictationSettings")({
  /** A language code such as `en`. None lets xAI detect the language. */
  language: Schema.Option(Schema.String),
  /** Write spoken numbers, currencies, and units as digits. Needs a language. */
  formatNumbers: Schema.Boolean,
  /** Paste the text into the frontmost app, or only copy it. */
  afterDictation: AfterDictation,
  keepHistory: Schema.Boolean,
}) {}

/** The user's dictation preferences. */
export class DictationPreferences extends Context.Service<DictationPreferences, DictationSettings>()(
  "grokcast/DictationPreferences",
) {}

export interface Recording {
  /** Mono 16 kHz signed 16-bit little-endian PCM. */
  readonly audio: Uint8Array<ArrayBuffer>
  readonly seconds: number
}

/**
 * Record until `stop` completes or `MAX_DICTATION` passes. `onAudio` gets the
 * seconds recorded so far, the level of each chunk for a meter, and the chunk.
 */
export const recordSpeech = Effect.fn("recordSpeech")(function* (
  stop: typeof Effect.void,
  onAudio: (seconds: number, level: number, chunk: Uint8Array) => void,
) {
  const recorder = yield* Recorder
  const limit = Effect.sleep(MAX_DICTATION)
  const stopped = Effect.raceFirst(stop, limit)

  const chunks = yield* recorder.record.pipe(
    Stream.interruptWhen(stopped),
    withRecordedBytes,
    Stream.tap(({ chunk, bytes }) =>
      Effect.sync(() => {
        onAudio(durationOfBytes(bytes), levelDbfs(chunk), chunk)
      }),
    ),
    Stream.map(({ chunk }) => chunk),
    Stream.runCollect,
  )

  const audio = joinChunks(chunks)

  return { audio, seconds: durationOfBytes(audio.byteLength) } satisfies Recording
})

/** Each chunk with the bytes recorded up to and including it. */
const withRecordedBytes = Stream.mapAccum(
  () => 0,
  (total: number, chunk: Uint8Array) =>
    [total + chunk.byteLength, [{ chunk, bytes: total + chunk.byteLength }]] as const,
)

/** Transcribe a whole recording with the user's preferences, in one request. */
export const transcribeRecording = Effect.fn("transcribeRecording")(function* (recording: Recording) {
  const settings = yield* DictationPreferences
  const transcriber = yield* Transcriber

  return yield* transcriber.transcribe(recording.audio, {
    language: settings.language,
    formatNumbers: settings.formatNumbers,
  })
})

/** What `dictateSpeech` reports while it runs. */
export interface DictationProgress {
  /** Seconds recorded so far and the level of the last chunk, for a meter. */
  readonly audio: (seconds: number, level: number) => void
  /** Everything heard so far. */
  readonly text: (text: string) => void
  /** Live text stopped. The text comes after recording stops. */
  readonly liveStopped: () => void
  /** Recording stopped after `seconds`, and the text is being finished. */
  readonly finishing: (seconds: number) => void
}

/** A finished dictation, with what is known about it. */
export class Dictation extends Schema.Class<Dictation>("Dictation")({
  text: Schema.String,
  /** Length of the recording in seconds. */
  seconds: Schema.Finite,
  /** The language xAI heard, such as `en`. */
  language: Schema.Option(Schema.String),
  /** Seconds from the end of recording until the text was ready. */
  readySeconds: Schema.Finite,
  /** True when the text came from live transcription, false when the whole recording was sent. */
  live: Schema.Boolean,
}) {}

/**
 * Record until `stop` completes and transcribe live while the user speaks. When live
 * transcription stops, or gives no text, the whole recording is sent in one request.
 * Non-empty text goes into the history when the user keeps one; a history that
 * cannot be saved does not fail this. None means no speech was heard.
 */
export const dictateSpeech = Effect.fn("dictateSpeech")(function* (
  stop: typeof Effect.void,
  progress: DictationProgress,
) {
  const settings = yield* DictationPreferences
  const live = yield* LiveTranscriber
  const audio = yield* Queue.unbounded<Uint8Array, Cause.Done>()

  const liveText = yield* Effect.forkChild(
    live.transcribe(Stream.fromQueue(audio), settings.language, progress.text).pipe(
      Effect.tapError(() => Effect.sync(progress.liveStopped)),
      Effect.option,
    ),
  )

  const recording = yield* recordSpeech(stop, (seconds, level, chunk) => {
    Queue.offerUnsafe(audio, chunk)
    progress.audio(seconds, level)
  }).pipe(Effect.ensuring(Queue.end(audio)))

  const dictation = yield* Effect.transposeOption(
    Option.map(
      Option.liftPredicate(recording, (recorded) => recorded.seconds >= MIN_DICTATION_SECONDS),
      (recorded) => finishDictation(recorded, liveText, progress, settings),
    ),
  )

  return Option.flatten(dictation)
})

const liveResult = (found: LiveTranscript) => ({
  text: found.text,
  language: found.language,
  live: true,
})

/** Send the whole recording in one request. */
const recordingResult = (recording: Recording) =>
  transcribeRecording(recording).pipe(
    Effect.map((found) => ({ text: found.text, language: found.language, live: false })),
  )

/** Keep `dictation` in the history. A history that cannot be saved does not fail this. */
const remember = (dictation: Dictation) => DictationHistory.use((history) => history.add(dictation)).pipe(Effect.ignore)

/**
 * After recording stops: wait for the live text, or send the whole recording when there
 * is none. None when no speech was heard.
 */
const finishDictation = (
  recording: Recording,
  liveText: Fiber.Fiber<Option.Option<LiveTranscript>>,
  progress: DictationProgress,
  settings: DictationSettings,
) =>
  Effect.gen(function* () {
    progress.finishing(recording.seconds)
    const stoppedAt = yield* Clock.currentTimeMillis

    const heard = yield* Fiber.join(liveText).pipe(
      Effect.timeoutOption(LIVE_FINISH_TIMEOUT),
      Effect.map((transcript) => Option.filter(Option.flatten(transcript), (found) => found.text !== "")),
    )

    const transcript = yield* Option.match(heard, {
      onSome: (found) => Effect.succeed(liveResult(found)),
      onNone: () => recordingResult(recording),
    })

    const readyAt = yield* Clock.currentTimeMillis

    const dictation = Option.map(
      Option.liftPredicate(transcript, (found) => found.text !== ""),
      (found) =>
        new Dictation({
          ...found,
          seconds: recording.seconds,
          readySeconds: (readyAt - stoppedAt) / 1000,
        }),
    )

    yield* Effect.transposeOption(
      Option.map(
        Option.filter(dictation, () => settings.keepHistory),
        remember,
      ),
    )

    return dictation
  })

/** The number of words in `text`. Works for languages that do not put spaces between words. */
export const countWords = (text: string): number =>
  Array.from(new Intl.Segmenter(undefined, { granularity: "word" }).segment(text)).filter(
    (segment) => segment.isWordLike === true,
  ).length

/** The name of a language code in the user's language, such as `English` for `en`. */
export const languageName = (code: string): string =>
  Option.getOrElse(Option.fromNullishOr(new Intl.DisplayNames(undefined, { type: "language" }).of(code)), () => code)

/** What a dictation's details can show. Older history entries lack some of them. */
export interface DictationFacts {
  readonly text: string
  readonly seconds: number
  readonly language: Option.Option<string>
  readonly readySeconds: Option.Option<number>
  readonly live: Option.Option<boolean>
}

/** Rows for a details panel: words, length, speed, language, wait, and method. */
export const detailRows = (facts: DictationFacts): ReadonlyArray<{ readonly title: string; readonly text: string }> =>
  rowsOf(facts, countWords(facts.text))

const methodName = (live: boolean): string =>
  Match.value(live).pipe(
    Match.when(true, () => "Live"),
    Match.orElse(() => "From the whole recording"),
  )

const rowsOf = (facts: DictationFacts, words: number) =>
  Arr.getSomes([
    Option.some({ title: "Words", text: String(words) }),
    Option.some({ title: "Length", text: clockOf(facts.seconds) }),
    Option.map(
      Option.liftPredicate(facts.seconds, (seconds) => seconds >= 1),
      (seconds) => ({ title: "Speed", text: `${Math.round((words / seconds) * 60)} words/min` }),
    ),
    Option.map(facts.language, (code) => ({ title: "Language", text: languageName(code) })),
    Option.map(facts.readySeconds, (seconds) => ({
      title: "Ready In",
      text: `${seconds.toFixed(1)} s`,
    })),
    Option.map(facts.live, (live) => ({ title: "Transcribed", text: methodName(live) })),
  ])

/** While the user speaks, show at most this many characters of the text. */
export const LIVE_TEXT_CHARS = 280

/**
 * The end of `text`, at most `LIVE_TEXT_CHARS` long and starting at a word, with an
 * ellipsis when the start was cut. A short view keeps each redraw small.
 */
export const recentText = (text: string): string =>
  Option.liftPredicate(text, (long) => long.length > LIVE_TEXT_CHARS).pipe(
    Option.map((long) => `…${fromFirstWord(long.slice(-LIVE_TEXT_CHARS))}`),
    Option.getOrElse(() => text),
  )

/** `tail` from its first whole word: after the first space, when it has one. */
const fromFirstWord = (tail: string): string =>
  Option.liftPredicate(tail.indexOf(" "), (space) => space >= 0).pipe(
    Option.map((space) => tail.slice(space + 1)),
    Option.getOrElse(() => tail),
  )

/** A length as minutes and seconds, such as `0:07` or `2:15`. */
export const clockOf = (seconds: number): string => minutesAndSeconds(Math.floor(seconds))

const minutesAndSeconds = (whole: number) => `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`

/** The language to send, from a preference value where `auto` means detect it. */
export const languageFromPreference = (value: string): Option.Option<string> =>
  Option.filter(Option.some(value.trim()), (code) => code !== "" && code !== "auto")
