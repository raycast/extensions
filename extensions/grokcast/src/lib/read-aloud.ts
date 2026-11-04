// Read Aloud: stop the speech that is playing, or read the text aloud with Grok's
// voice in the background. No Raycast imports, so tests run it under plain Node.

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

/**
 * The text from the first source that has some, such as the argument, then the
 * selection, then the clipboard. Later sources are not read once one has text.
 */
export const firstText = <E>(
  sources: ReadonlyArray<Effect.Effect<Option.Option<string>, E>>,
): Effect.Effect<Option.Option<string>, E> =>
  Effect.reduce(
    sources,
    () => Option.none<string>(),
    (found, source) =>
      Option.isSome(found) ? Effect.succeed(found) : Effect.map(source, Option.filter(notBlank)),
  )

/**
 * Stop the speech that is playing. When nothing is playing, read the text from
 * `text` aloud. `onSpeaking` runs before the request to xAI, for a progress message.
 */
export const readAloud = Effect.fn("readAloud")(function* <E>(
  text: Effect.Effect<Option.Option<string>, E>,
  onSpeaking: Effect.Effect<void>,
) {
  const player = yield* SpeechPlayer
  if (yield* player.stop) return ReadAloudResult.Stopped()
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
