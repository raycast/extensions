import { readFile } from "node:fs/promises"
import { basename } from "node:path"
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api"
import * as Arr from "effect/Array"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { useEffect, useRef, useState } from "react"
import { clockOf, recordSpeech } from "./lib/dictation.ts"
import { GrokRuntime } from "./lib/grok.ts"
import { levelBar } from "./lib/recorder.ts"
import { SpeechPlayer } from "./lib/speech-player.ts"
import { Speaker, SpeechPreferences, SpeechSettings } from "./lib/speech.ts"
import {
  labelsOf,
  MAX_REFERENCE_SECONDS,
  ReadAloudVoice,
  ReferenceAudio,
  VoiceAge,
  VoiceGender,
  VoiceLabels,
  VoiceLibrary,
  VoiceTone,
  VoiceUseCase,
  wavOf,
  type ChosenVoice,
  type GrokVoice,
} from "./lib/voices.ts"
import type { XaiFailure } from "./lib/xai.ts"

type State = Data.TaggedEnum<{
  Loading: {}
  Loaded: {
    readonly voices: ReadonlyArray<GrokVoice>
    readonly readAloud: Option.Option<ChosenVoice>
  }
  Failed: { readonly failure: XaiFailure }
}>
const State = Data.taggedEnum<State>()

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

/** What a preview says. */
const sampleText = (voice: GrokVoice) =>
  `Hi, I'm ${voice.name}. This is how I sound when Grokcast reads to you.`

/** A message that could not be shown is not worth failing over. */
const toast = (options: Toast.Options) =>
  Effect.tryPromise(() => showToast(options)).pipe(Effect.ignore)

const failureToast = (title: string) => (failure: { readonly message: string }) =>
  toast({ style: Toast.Style.Failure, title, message: failure.message })

export default function Voices() {
  const [state, setState] = useState<State>(State.Loading())
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const fiber = GrokRuntime.runFork(
      Effect.all([
        VoiceLibrary.use((library) => library.list),
        ReadAloudVoice.use((voice) => voice.get),
      ]).pipe(
        Effect.map(([voices, readAloud]) => State.Loaded({ voices, readAloud })),
        Effect.catchTag("VoicesError", (failure) => Effect.succeed(State.Failed({ failure }))),
        Effect.flatMap((next) => Effect.sync(() => setState(next))),
      ),
    )
    return () => {
      GrokRuntime.runFork(Fiber.interrupt(fiber))
    }
  }, [attempt])

  const reload = () => setAttempt((count) => count + 1)

  const run = (
    program: Effect.Effect<void, never, ManagedRuntime.ManagedRuntime.Services<typeof GrokRuntime>>,
  ) => GrokRuntime.runFork(program)

  const preview = (voice: GrokVoice) =>
    run(
      Effect.gen(function* () {
        yield* toast({ style: Toast.Style.Animated, title: `Getting ${voice.name}'s voice…` })
        const preferences = yield* SpeechPreferences
        const speech = yield* Speaker.use((speaker) =>
          speaker.speak(
            sampleText(voice),
            new SpeechSettings({ ...preferences, voice: Option.some(voice.id) }),
          ),
        )
        yield* SpeechPlayer.use((player) => player.play(speech.audio))
        yield* toast({ style: Toast.Style.Success, title: `Playing ${voice.name}` })
      }).pipe(
        Effect.catchTags({
          SpeechError: failureToast("Could Not Preview the Voice"),
          PlaybackError: failureToast("Could Not Preview the Voice"),
        }),
      ),
    )

  const stopPreview = () => run(SpeechPlayer.use((player) => player.stop).pipe(Effect.asVoid))

  const useForReadAloud = (voice: GrokVoice) =>
    run(
      ReadAloudVoice.use((chosen) => chosen.set(voice)).pipe(
        Effect.andThen(
          toast({ style: Toast.Style.Success, title: `Read Aloud Now Uses ${voice.name}` }),
        ),
        Effect.andThen(Effect.sync(reload)),
      ),
    )

  const stopUsingForReadAloud = () =>
    run(
      ReadAloudVoice.use((chosen) => chosen.clear).pipe(
        Effect.andThen(
          toast({
            style: Toast.Style.Success,
            title: "Read Aloud Uses Its Voice Preference Again",
          }),
        ),
        Effect.andThen(Effect.sync(reload)),
      ),
    )

  const remove = async (voice: GrokVoice) => {
    const confirmed = await confirmAlert({
      title: `Delete ${voice.name}?`,
      message: "This deletes the custom voice at xAI. It cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    })
    if (!confirmed) return
    run(
      VoiceLibrary.use((library) => library.remove(voice.id)).pipe(
        Effect.andThen(toast({ style: Toast.Style.Success, title: `Deleted ${voice.name}` })),
        Effect.andThen(Effect.sync(reload)),
        Effect.catchTag("VoicesError", failureToast("Could Not Delete the Voice")),
      ),
    )
  }

  const createActions = (
    <>
      <Action.Push
        title="Record a New Voice"
        icon={Icon.Microphone}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<RecordVoice onCreated={reload} />}
      />
      <Action.Push
        title="New Voice from Audio File"
        icon={Icon.Upload}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        target={<VoiceForm mode={{ _tag: "FromFile" }} onDone={reload} />}
      />
    </>
  )

  return State.$match(state, {
    Loading: () => <List isLoading searchBarPlaceholder="Search voices" />,
    Failed: ({ failure }) => (
      <List searchBarPlaceholder="Search voices">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load the voices"
          description={failure.message}
          actions={
            <ActionPanel>
              {failure.reason === "signIn" ? <SignInAction /> : null}
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={reload} />
            </ActionPanel>
          }
        />
      </List>
    ),
    Loaded: ({ voices, readAloud }) => {
      const custom = Arr.filter(voices, (voice) => voice.custom)
      const builtIn = Arr.filter(voices, (voice) => !voice.custom)
      const isReadAloud = (voice: GrokVoice) =>
        Option.exists(readAloud, (chosen) => chosen.id === voice.id)
      const item = (voice: GrokVoice) => (
        <List.Item
          key={voice.id}
          title={voice.name}
          keywords={[voice.id]}
          icon={voice.custom ? Icon.Person : Icon.SpeakerOn}
          accessories={
            isReadAloud(voice)
              ? [
                  {
                    tag: { value: "Read Aloud", color: Color.Green },
                    tooltip: "Read Aloud uses this voice",
                  },
                ]
              : []
          }
          detail={<VoiceDetail voice={voice} readAloud={isReadAloud(voice)} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Preview Voice" icon={Icon.Play} onAction={() => preview(voice)} />
                <Action
                  title="Stop Preview"
                  icon={Icon.Stop}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  onAction={stopPreview}
                />
                {isReadAloud(voice) ? (
                  <Action
                    title="Stop Using for Read Aloud"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                    onAction={stopUsingForReadAloud}
                  />
                ) : (
                  <Action
                    title="Use for Read Aloud"
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                    onAction={() => useForReadAloud(voice)}
                  />
                )}
                <Action.CopyToClipboard title="Copy Voice ID" content={voice.id} />
              </ActionPanel.Section>
              {voice.custom ? (
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Voice"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<VoiceForm mode={{ _tag: "Edit", voice }} onDone={reload} />}
                  />
                  <Action
                    title="Delete Voice"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => void remove(voice)}
                  />
                </ActionPanel.Section>
              ) : null}
              <ActionPanel.Section>
                {createActions}
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={reload}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      )
      return (
        <List isShowingDetail={voices.length > 0} searchBarPlaceholder="Search voices">
          <List.EmptyView
            icon={Icon.SpeakerOn}
            title="No voices"
            description="Record a new voice to add one."
            actions={<ActionPanel>{createActions}</ActionPanel>}
          />
          <List.Section title="Your Voices">{custom.map(item)}</List.Section>
          <List.Section title="Grok Voices">{builtIn.map(item)}</List.Section>
        </List>
      )
    },
  })
}

function VoiceDetail({
  voice,
  readAloud,
}: {
  readonly voice: GrokVoice
  readonly readAloud: boolean
}) {
  const row = (title: string, value: Option.Option<string>) =>
    Option.match(value, {
      onNone: () => null,
      onSome: (text) => <List.Item.Detail.Metadata.Label title={title} text={text} />,
    })
  return (
    <List.Item.Detail
      markdown={Option.match(voice.description, {
        onNone: () => `# ${voice.name}`,
        onSome: (description) => `# ${voice.name}\n\n${description}`,
      })}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Voice ID" text={voice.id} />
          <List.Item.Detail.Metadata.Label
            title="Kind"
            text={voice.custom ? "Custom" : "Built-in"}
          />
          {row("Language", voice.language)}
          {row("Gender", Option.map(voice.gender, titleCase))}
          {row("Age", Option.map(voice.age, titleCase))}
          {row("Accent", voice.accent)}
          {row("Use", Option.map(voice.useCase, titleCase))}
          {row("Tone", Option.map(voice.tone, titleCase))}
          {row(
            "Created",
            Option.map(voice.created, (millis) => dateFormat.format(millis)),
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Read Aloud"
            text={readAloud ? "Uses this voice" : "Press ⌘U to use this voice"}
          />
        </List.Item.Detail.Metadata>
      }
    />
  )
}

/** Such as `social_media` to `Social Media`. */
const titleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter((word) => word !== "")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

function SignInAction() {
  return (
    <Action
      title="Sign in to Grok"
      icon={Icon.Person}
      onAction={() =>
        void launchCommand({
          name: "account",
          type: LaunchType.UserInitiated,
          context: { signIn: true },
        })
      }
    />
  )
}

type RecordState = Data.TaggedEnum<{
  Starting: {}
  Recording: { readonly seconds: number; readonly level: number }
  Failed: { readonly message: string }
}>
const RecordState = Data.taggedEnum<RecordState>()

/** Steps in the level meter. Fewer steps mean fewer redraws. */
const METER_STEPS = 8

/** xAI makes a better voice from at least this much speech. */
const SUGGESTED_SECONDS = 30

/** Record a clip of up to `MAX_REFERENCE_SECONDS`, then name the new voice. */
function RecordVoice({ onCreated }: { readonly onCreated: () => void }) {
  const { push } = useNavigation()
  const [state, setState] = useState<RecordState>(RecordState.Starting())
  const [attempt, setAttempt] = useState(0)
  const stopRef = useRef<() => void>(() => {})

  useEffect(() => {
    const stopped = Effect.callback<void>((resume) => {
      stopRef.current = () => resume(Effect.void)
    })
    const shown = { key: "" }
    const fiber = GrokRuntime.runFork(
      recordSpeech(stopped, (seconds, level) => {
        if (seconds >= MAX_REFERENCE_SECONDS) stopRef.current()
        const key = `${levelBar(level, METER_STEPS)} ${clockOf(seconds)}`
        if (key === shown.key) return
        shown.key = key
        setState(RecordState.Recording({ seconds, level }))
      }).pipe(
        Effect.flatMap((recording) =>
          Effect.sync(() =>
            push(
              <VoiceForm
                mode={{
                  _tag: "Recorded",
                  audio: new ReferenceAudio({
                    bytes: wavOf(recording.audio),
                    filename: "recording.wav",
                  }),
                  seconds: recording.seconds,
                }}
                onDone={onCreated}
              />,
            ),
          ),
        ),
        Effect.catchTag("RecorderError", (error) =>
          Effect.sync(() => setState(RecordState.Failed({ message: error.message }))),
        ),
      ),
    )
    return () => {
      GrokRuntime.runFork(Fiber.interrupt(fiber))
    }
  }, [attempt, onCreated, push])

  const guide = [
    "# Record a New Voice",
    "",
    `Read anything aloud in your normal voice for about ${SUGGESTED_SECONDS} seconds, in a quiet room. Recording stops on its own at ${clockOf(MAX_REFERENCE_SECONDS)}.`,
    "",
    "Press Return when you are done. Only record your own voice, or a voice you have permission to use.",
  ].join("\n")

  return RecordState.$match(state, {
    Starting: () => <Detail isLoading markdown={guide} />,
    Recording: ({ seconds, level }) => (
      <Detail
        isLoading
        markdown={guide}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text="Listening"
              icon={{ source: Icon.Microphone, tintColor: Color.Red }}
            />
            <Detail.Metadata.Label title="Level" text={levelBar(level, METER_STEPS)} />
            <Detail.Metadata.Label
              title="Length"
              text={`${clockOf(seconds)} of ${clockOf(MAX_REFERENCE_SECONDS)}`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Cancel" text="Esc" />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action title="Stop Recording" icon={Icon.Stop} onAction={() => stopRef.current()} />
          </ActionPanel>
        }
      />
    ),
    Failed: ({ message }) => (
      <Detail
        markdown={message}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setState(RecordState.Starting())
                setAttempt((count) => count + 1)
              }}
            />
          </ActionPanel>
        }
      />
    ),
  })
}

type FormMode =
  | { readonly _tag: "FromFile" }
  | { readonly _tag: "Recorded"; readonly audio: ReferenceAudio; readonly seconds: number }
  | { readonly _tag: "Edit"; readonly voice: GrokVoice }

/** Form values for one choice. An empty string is "Not Set". */
const NOT_SET = ""

const choice = <A extends string>(schema: Schema.Decoder<A>, value: string): Option.Option<A> =>
  Schema.decodeUnknownOption(schema)(value)

const textValue = (value: string): Option.Option<string> =>
  Option.liftPredicate(value.trim(), (trimmed) => trimmed !== "")

/** Make a custom voice from a recording or a file, or change one's labels. */
function VoiceForm({ mode, onDone }: { readonly mode: FormMode; readonly onDone: () => void }) {
  const { pop } = useNavigation()
  const initial = mode._tag === "Edit" ? labelsOf(mode.voice) : VoiceLabels.empty
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState<Option.Option<string>>(Option.none())
  const [fileError, setFileError] = useState<Option.Option<string>>(Option.none())

  const optionChoices = (values: ReadonlyArray<string>) => [
    <Form.Dropdown.Item key="not-set" value={NOT_SET} title="Not Set" />,
    ...values.map((value) => (
      <Form.Dropdown.Item key={value} value={value} title={titleCase(value)} />
    )),
  ]

  const submit = (values: {
    readonly name: string
    readonly description: string
    readonly gender: string
    readonly age: string
    readonly accent: string
    readonly language: string
    readonly useCase: string
    readonly tone: string
    readonly files?: ReadonlyArray<string>
  }) => {
    const name = textValue(values.name)
    if (Option.isNone(name)) {
      setNameError(Option.some("Enter a name"))
      return
    }
    const file = Arr.head(values.files ?? [])
    if (mode._tag === "FromFile" && Option.isNone(file)) {
      setFileError(Option.some("Choose an audio file"))
      return
    }
    const labels = new VoiceLabels({
      name,
      description: textValue(values.description),
      gender: choice(VoiceGender, values.gender),
      age: choice(VoiceAge, values.age),
      accent: textValue(values.accent),
      language: textValue(values.language),
      useCase: choice(VoiceUseCase, values.useCase),
      tone: choice(VoiceTone, values.tone),
    })
    const audio: Effect.Effect<ReferenceAudio, { readonly message: string }> =
      mode._tag === "Recorded"
        ? Effect.succeed(mode.audio)
        : Effect.tryPromise({
            try: async () => {
              const path = Option.getOrElse(file, () => "")
              return new ReferenceAudio({
                bytes: new Uint8Array(await readFile(path)),
                filename: basename(path),
              })
            },
            catch: () => ({ message: "Could not read the audio file." }),
          })
    const program =
      mode._tag === "Edit"
        ? VoiceLibrary.use((library) => library.update(mode.voice.id, labels)).pipe(
            Effect.andThen(
              toast({
                style: Toast.Style.Success,
                title: `Saved ${Option.getOrElse(name, () => "")}`,
              }),
            ),
            Effect.catchTag("VoicesError", failureToast("Could Not Save the Voice")),
          )
        : audio.pipe(
            Effect.tap(() => toast({ style: Toast.Style.Animated, title: "Making the voice…" })),
            Effect.flatMap((clip) => VoiceLibrary.use((library) => library.create(clip, labels))),
            Effect.flatMap((voice) =>
              toast({
                style: Toast.Style.Success,
                title: `Made ${voice.name}`,
                message: "Preview it, or press ⌘U to use it for Read Aloud.",
              }),
            ),
            Effect.catch(failureToast("Could Not Make the Voice")),
          )
    setSaving(true)
    GrokRuntime.runFork(
      program.pipe(
        Effect.andThen(
          Effect.sync(() => {
            setSaving(false)
            onDone()
            // A recording opened this form from the recorder, so go back past it too.
            pop()
            if (mode._tag === "Recorded") pop()
          }),
        ),
      ),
    )
  }

  const title = mode._tag === "Edit" ? "Edit Voice" : "New Voice"

  return (
    <Form
      isLoading={saving}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode._tag === "Edit" ? "Save Voice" : "Make Voice"}
            icon={Icon.Check}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      {mode._tag === "FromFile" ? (
        <Form.FilePicker
          id="files"
          title="Audio"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          error={Option.getOrUndefined(fileError)}
          onChange={() => setFileError(Option.none())}
          info={`A clip of one person speaking, up to ${MAX_REFERENCE_SECONDS} seconds, such as WAV or MP3.`}
        />
      ) : null}
      {mode._tag === "Recorded" ? (
        <Form.Description title="Audio" text={`Your recording (${clockOf(mode.seconds)})`} />
      ) : null}
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Voice"
        defaultValue={Option.getOrElse(initial.name, () => "")}
        error={Option.getOrUndefined(nameError)}
        onChange={() => setNameError(Option.none())}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional"
        defaultValue={Option.getOrElse(initial.description, () => "")}
      />
      <Form.Separator />
      <Form.Dropdown
        id="gender"
        title="Gender"
        defaultValue={Option.getOrElse(initial.gender, () => NOT_SET)}
      >
        {optionChoices(VoiceGender.literals)}
      </Form.Dropdown>
      <Form.Dropdown
        id="age"
        title="Age"
        defaultValue={Option.getOrElse(initial.age, () => NOT_SET)}
      >
        {optionChoices(VoiceAge.literals)}
      </Form.Dropdown>
      <Form.TextField
        id="accent"
        title="Accent"
        placeholder="Optional, such as British"
        defaultValue={Option.getOrElse(initial.accent, () => "")}
      />
      <Form.TextField
        id="language"
        title="Language"
        placeholder="Optional, such as en"
        defaultValue={Option.getOrElse(initial.language, () => "")}
      />
      <Form.Dropdown
        id="useCase"
        title="Use"
        defaultValue={Option.getOrElse(initial.useCase, () => NOT_SET)}
      >
        {optionChoices(VoiceUseCase.literals)}
      </Form.Dropdown>
      <Form.Dropdown
        id="tone"
        title="Tone"
        defaultValue={Option.getOrElse(initial.tone, () => NOT_SET)}
      >
        {optionChoices(VoiceTone.literals)}
      </Form.Dropdown>
    </Form>
  )
}
