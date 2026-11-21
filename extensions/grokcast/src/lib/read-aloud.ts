// Read Aloud: stop the speech that is playing, or read the text aloud with Grok's
// voice in the background. No Raycast imports, so tests run it under plain Node.

import * as Bool from "effect/Boolean"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { SpeechPlayer } from "./speech-player.ts"
import { Speaker, SpeechError, SpeechPreferences, SpeechSettings } from "./speech.ts"
import { ReadAloudVoice } from "./voices.ts"

export type ReadAloudResult = Data.TaggedEnum<{
  /** Speech was playing, and this run stopped it. */
  Stopped: {}
  /** Speech started to play in the background. */
  Reading: { readonly characters: number }
}>

export const ReadAloudResult = Data.taggedEnum<ReadAloudResult>()

const notBlank = (text: string) => text.trim() !== ""

/** Somewhere to read text from, such as the selection. None when it has no text. */
// oxlint-disable-next-line solzero/no-manual-effect-channels -- the caller supplies these effects, so there is no Effect here to infer the type from
export type TextSource<E> = Effect.Effect<Option.Option<string>, E>

/**
 * The text from the first source that has some, such as the argument, then the
 * selection, then the clipboard. Later sources are not read once one has text.
 */
export const firstText = <E>(sources: ReadonlyArray<TextSource<E>>) =>
  Effect.reduce(
    sources,
    () => Option.none<string>(),
    (found, source) =>
      Effect.map(
        // Text already found is not blank, so the filter keeps it.
        Option.match(found, { onNone: () => source, onSome: () => Effect.succeed(found) }),
        Option.filter(notBlank),
      ),
  )

/** Read the text from `text` aloud in the background. */
const read = Effect.fn("readAloud.read")(function* <E>(text: TextSource<E>, onSpeaking: typeof Effect.void) {
  const player = yield* SpeechPlayer
  const found = yield* text

  const chosen = yield* Option.match(found, {
    onNone: () =>
      Effect.fail(
        new SpeechError({
          reason: "noText",
          message: "Select or copy some text, then run Read Aloud again.",
        }),
      ),
    onSome: Effect.succeed,
  })

  yield* onSpeaking
  const speaker = yield* Speaker
  const preferences = yield* SpeechPreferences
  // A voice picked in Grok Voices wins over the Voice preference.
  const picked = yield* ReadAloudVoice.use((voice) => voice.get)

  const settings = new SpeechSettings({
    ...preferences,
    voice: Option.orElse(
      Option.map(picked, (voice) => voice.id),
      () => preferences.voice,
    ),
  })

  const speech = yield* speaker.speak(chosen, settings)
  yield* player.play(speech.audio)

  return ReadAloudResult.Reading({ characters: speech.characters })
})

/**
 * Stop the speech that is playing. When nothing is playing, read the text from
 * `text` aloud. `onSpeaking` runs before the request to xAI, for a progress message.
 */
export const readAloud = Effect.fn("readAloud")(function* <E>(text: TextSource<E>, onSpeaking: typeof Effect.void) {
  const player = yield* SpeechPlayer
  const stopped = yield* player.stop

  return yield* Bool.match(stopped, {
    onTrue: () => Effect.succeed(ReadAloudResult.Stopped()),
    onFalse: () => read(text, onSpeaking),
  })
})
