import { Clipboard, closeMainWindow, getSelectedText, showHUD, showToast, Toast, type LaunchProps } from "@raycast/api"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { GrokRuntime } from "./lib/grok.ts"
import { firstText, readAloud, ReadAloudResult } from "./lib/read-aloud.ts"
import { signIn as openSignIn } from "./components/launch.tsx"

/** Raycast passes an empty string when the optional argument is left empty. */
interface ReadAloudArguments {
  readonly text: string
}

const fromArgument = (text: string) => Effect.succeed(Option.some(text))

/** No selection, or no permission to read it, counts as no text. */
const fromSelection = Effect.tryPromise(() => getSelectedText()).pipe(
  Effect.map(Option.some),
  Effect.catch(() => Effect.succeedNone),
)

const fromClipboard = Effect.tryPromise(() => Clipboard.readText()).pipe(
  Effect.map(Option.fromNullishOr),
  Effect.catch(() => Effect.succeedNone),
)

/** A message that could not be shown is not worth failing over. */
const ui = <A,>(show: () => Promise<A>) => Effect.tryPromise(show).pipe(Effect.ignore)

const hud = (title: string) => ui(() => showHUD(title))

const signIn = ui(openSignIn)

const failure = (message: string) =>
  ui(() => showToast({ style: Toast.Style.Failure, title: "Could Not Read Aloud", message }))

/**
 * Reads the argument, the selected text, or the clipboard aloud in the background.
 * Run it again while it reads to stop.
 */
export default async function ReadAloud(props: LaunchProps<{ arguments: ReadAloudArguments }>) {
  await closeMainWindow()
  await GrokRuntime.runPromise(
    readAloud(
      firstText([fromArgument(props.arguments.text), fromSelection, fromClipboard]),
      hud("Getting Speech from Grok…"),
    ).pipe(
      Effect.flatMap(
        ReadAloudResult.$match({
          Stopped: () => hud("Stopped Reading"),
          Reading: () => hud("Reading Aloud. Run Read Aloud Again to Stop."),
        }),
      ),
      Effect.catchTags({
        SpeechError: (error) =>
          error.reason === "signIn" ? Effect.andThen(hud(error.message), signIn) : failure(error.message),
        PlaybackError: (error) => failure(error.message),
      }),
    ),
  )
}
