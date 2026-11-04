import { readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { basename, join } from "node:path"
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
  type Image,
} from "@raycast/api"
import * as Arr from "effect/Array"
import * as Data from "effect/Data"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { useEffect, useState, type ReactNode } from "react"
import { GrokRuntime } from "./lib/grok.ts"
import {
  ASPECT_RATIOS,
  mediaTypeOf,
  progressBar,
  RESOLUTIONS,
  VideoError,
  VideoGenerator,
  VideoRequest,
  type MediaFile,
  type Video,
} from "./lib/video.ts"
import { SignInAction } from "./components/launch.tsx"

const Mode = Schema.Literals(["generate", "edit", "extend"])

type Mode = typeof Mode.Type

/** The form's dropdowns use this value for "leave it to xAI". */
const XAI_DEFAULT = "default"

const GENERATE_SECONDS = [3, 5, 8, 10, 15]
const EXTEND_SECONDS = [2, 4, 6, 8, 10]

const FormValues = Schema.Struct({
  mode: Mode,
  prompt: Schema.String,
  // Fields that the chosen mode hides are missing.
  image: Schema.OptionFromOptionalKey(Schema.Array(Schema.String)),
  video: Schema.OptionFromOptionalKey(Schema.Array(Schema.String)),
  duration: Schema.OptionFromOptionalKey(Schema.String),
  aspectRatio: Schema.OptionFromOptionalKey(Schema.String),
  resolution: Schema.OptionFromOptionalKey(Schema.String),
})

type FormValues = typeof FormValues.Type

/** The file a picker holds, when there is one. */
const pickedFile = (paths: Option.Option<ReadonlyArray<string>>) =>
  paths.pipe(
    Option.flatMap(Arr.head),
    Option.filter((path) => path !== ""),
  )

/** A dropdown's value, or None when it is left to xAI. */
const chosen = (value: Option.Option<string>) => Option.filter(value, (picked) => picked !== XAI_DEFAULT)

const chosenSeconds = (value: Option.Option<string>) =>
  chosen(value).pipe(Option.map(Number), Option.filter(Number.isFinite))

const isOneOf =
  <const Values extends ReadonlyArray<string>>(values: Values) =>
  (value: string): value is Values[number] =>
    values.includes(value)

export default function GenerateVideo() {
  const { push } = useNavigation()
  const [mode, setMode] = useState<Mode>("generate")
  const [error, setError] = useState<Option.Option<string>>(Option.none())

  const submit = (raw: Form.Values) => {
    const values = Schema.decodeUnknownOption(FormValues)(raw)

    const problem = Option.match(values, {
      onNone: () => Option.some("Check the form and try again."),
      onSome: formProblem,
    })

    setError(problem)

    if (Option.isSome(problem) || Option.isNone(values)) return
    push(<VideoJob values={values.value} />)
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Make Video" icon={Icon.FilmStrip} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mode"
        title="Make"
        value={mode}
        onChange={(value) =>
          setMode(Schema.decodeUnknownOption(Mode)(value).pipe(Option.getOrElse((): Mode => "generate")))
        }
      >
        <Form.Dropdown.Item value="generate" title="New Video" icon={Icon.FilmStrip} />
        <Form.Dropdown.Item value="edit" title="Edit a Video" icon={Icon.Pencil} />
        <Form.Dropdown.Item value="extend" title="Extend a Video" icon={Icon.Plus} />
      </Form.Dropdown>
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder={Match.value(mode).pipe(
          Match.when("generate", () => "A red fox runs through fresh snow at dawn"),
          Match.when("edit", () => "Make it night, with falling snow"),
          Match.orElse(() => "The fox stops and looks at the camera"),
        )}
        info={
          mode === "generate"
            ? "Optional when you choose a starting image."
            : "Say what to change, or what happens next."
        }
        error={Option.getOrUndefined(error)}
        onChange={() => setError(Option.none())}
      />
      {mode === "generate" ? (
        <Form.FilePicker
          id="image"
          title="Starting Image"
          info="Optional. A JPEG, PNG, or WebP picture becomes the first frame."
          allowMultipleSelection={false}
          canChooseDirectories={false}
        />
      ) : (
        <Form.FilePicker
          id="video"
          title="Video"
          info={
            mode === "extend" ? "An MP4 of 2 to 15 seconds. The new part continues from its end." : "An MP4 to change."
          }
          allowMultipleSelection={false}
          canChooseDirectories={false}
        />
      )}
      {mode === "edit" ? null : (
        <Form.Dropdown id="duration" title={mode === "extend" ? "Seconds to Add" : "Length"} defaultValue={XAI_DEFAULT}>
          <Form.Dropdown.Item value={XAI_DEFAULT} title="xAI Default" />
          {(mode === "extend" ? EXTEND_SECONDS : GENERATE_SECONDS).map((seconds) => (
            <Form.Dropdown.Item key={seconds} value={String(seconds)} title={`${seconds} Seconds`} />
          ))}
        </Form.Dropdown>
      )}
      {mode === "generate" ? (
        <>
          <Form.Dropdown id="aspectRatio" title="Aspect Ratio" defaultValue={XAI_DEFAULT}>
            <Form.Dropdown.Item value={XAI_DEFAULT} title="xAI Default" />
            {ASPECT_RATIOS.map((ratio) => (
              <Form.Dropdown.Item key={ratio} value={ratio} title={ratio} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown id="resolution" title="Resolution" defaultValue={XAI_DEFAULT}>
            <Form.Dropdown.Item value={XAI_DEFAULT} title="xAI Default" />
            {RESOLUTIONS.map((resolution) => (
              <Form.Dropdown.Item key={resolution} value={resolution} title={resolution} />
            ))}
          </Form.Dropdown>
        </>
      ) : null}
      <Form.Description
        title="Model"
        text="xAI default. Videos use your Grok or X subscription and count against its usage."
      />
    </Form>
  )
}

/** Why the form cannot be sent yet, if anything. */
const formProblem = (values: FormValues): Option.Option<string> => {
  const prompt = values.prompt.trim()

  return Match.value(values.mode).pipe(
    Match.when("generate", () =>
      prompt === "" && Option.isNone(pickedFile(values.image))
        ? Option.some("Write a prompt or choose a starting image.")
        : Option.none(),
    ),
    Match.orElse(() =>
      prompt === ""
        ? Option.some("Write a prompt.")
        : Option.isNone(pickedFile(values.video))
          ? Option.some("Choose an MP4 video.")
          : Option.none(),
    ),
  )
}

type State = Data.TaggedEnum<{
  Starting: {}
  Generating: { readonly progress: Option.Option<number> }
  Done: { readonly video: Video; readonly saved: Option.Option<string> }
  Failed: {
    readonly message: string
    readonly signIn: boolean
    readonly requestId: Option.Option<string>
  }
}>

const State = Data.taggedEnum<State>()

/** What to run: a new job from the form, or another look at a job xAI may still finish. */
type Task = Data.TaggedEnum<{
  Make: {}
  CheckAgain: { readonly requestId: string }
}>

const Task = Data.taggedEnum<Task>()

function VideoJob({ values }: { readonly values: FormValues }) {
  const { pop } = useNavigation()
  const [state, setState] = useState<State>(State.Starting())

  const [task, setTask] = useState<{ readonly task: Task; readonly attempt: number }>({
    task: Task.Make(),
    attempt: 0,
  })

  useEffect(() => {
    const onPending = (progress: Option.Option<number>) => Effect.sync(() => setState(State.Generating({ progress })))

    const program = Task.$match(task.task, {
      Make: () =>
        requestFrom(values).pipe(
          Effect.flatMap((request) => VideoGenerator.use((videos) => videos.generate(request, onPending))),
        ),
      CheckAgain: ({ requestId }) =>
        onPending(Option.none()).pipe(
          Effect.andThen(VideoGenerator.use((videos) => videos.follow(requestId, onPending))),
        ),
    })

    const fiber = GrokRuntime.runFork(
      program.pipe(
        Effect.tap((video) => Effect.sync(() => setState(State.Done({ video, saved: Option.none() })))),
        Effect.catchTag("VideoError", (error) =>
          Effect.sync(() =>
            setState(
              State.Failed({
                message: error.message,
                signIn: error.reason === "signIn",
                requestId: error.requestId,
              }),
            ),
          ),
        ),
      ),
    )

    return () => {
      GrokRuntime.runFork(Fiber.interrupt(fiber))
    }
  }, [task, values])

  const run = (next: Task) => {
    setState(State.Starting())
    setTask((current) => ({ task: next, attempt: current.attempt + 1 }))
  }

  const save = (video: Video) =>
    GrokRuntime.runFork(
      saveToDownloads(video).pipe(
        Effect.tap((path) => Effect.sync(() => setState(State.Done({ video, saved: Option.some(path) })))),
        Effect.flatMap((path) =>
          Effect.tryPromise(() =>
            showToast({
              style: Toast.Style.Success,
              title: "Saved to Downloads",
              message: basename(path),
              primaryAction: { title: "Show in Finder", onAction: () => void showInFinder(path) },
            }),
          ),
        ),
        Effect.catch((error) =>
          Effect.tryPromise(() =>
            showToast({
              style: Toast.Style.Failure,
              title: "Could not save the video",
              message: error.message,
            }),
          ),
        ),
        Effect.ignore,
      ),
    )

  const makeAnother = (
    <Action
      title="Make Another Video"
      icon={Icon.FilmStrip}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={pop}
    />
  )

  const summary = describeRequest(values)

  return State.$match(state, {
    Starting: () => <Detail isLoading markdown={summary} metadata={<Status label="Sending to Grok" />} />,
    Generating: ({ progress }) => (
      <Detail
        isLoading
        markdown={[
          summary,
          "",
          "_Grok is making your video. It usually takes a minute or two. Keep this open: closing it stops waiting._",
        ].join("\n")}
        metadata={
          <Status label="Making the Video" icon={Icon.Hourglass}>
            <Detail.Metadata.Label
              title="Progress"
              text={Option.match(progress, {
                onNone: () => "Waiting for xAI",
                onSome: (percent) => `${progressBar(percent, PROGRESS_STEPS)} ${percent}%`,
              })}
            />
          </Status>
        }
      />
    ),
    Done: ({ video, saved }) => (
      <Detail
        markdown={[summary, "", `[Open the video](${video.url})`].join("\n")}
        metadata={
          <Status label="Ready" icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}>
            <Detail.Metadata.Label title="Length" text={`${video.seconds} seconds`} />
            <Detail.Metadata.Label title="Model" text={Option.getOrElse(video.model, () => "xAI default")} />
            <Detail.Metadata.Label
              title="Saved"
              text={Option.match(saved, { onNone: () => "Not yet", onSome: basename })}
            />
          </Status>
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Video" url={video.url} />
            {Option.match(saved, {
              onNone: () => (
                <Action
                  title="Save to Downloads"
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={() => save(video)}
                />
              ),
              onSome: (path) => <Action.ShowInFinder path={path} shortcut={{ modifiers: ["cmd"], key: "s" }} />,
            })}
            <Action.CopyToClipboard
              title="Copy Video Link"
              content={video.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {makeAnother}
          </ActionPanel>
        }
      />
    ),
    Failed: ({ message, signIn, requestId }) => (
      <Detail
        markdown={message}
        metadata={
          <Status label="The video did not finish" icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} />
        }
        actions={
          <ActionPanel>
            {Option.match(requestId, {
              onNone: () => null,
              onSome: (id) => (
                <Action
                  title="Check Again"
                  icon={Icon.ArrowClockwise}
                  onAction={() => run(Task.CheckAgain({ requestId: id }))}
                />
              ),
            })}
            {signIn ? <SignInAction /> : null}
            <Action title="Try Again" icon={Icon.Repeat} onAction={() => run(Task.Make())} />
            {makeAnother}
          </ActionPanel>
        }
      />
    ),
  })
}

/** Steps in the side panel's progress bar. */
const PROGRESS_STEPS = 10

/** The side panel: the status first, then `children`. Every state uses it, so the layout stays put. */
function Status({
  label,
  icon = Icon.FilmStrip,
  children,
}: {
  readonly label: string
  readonly icon?: Image.ImageLike
  readonly children?: ReactNode
}) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Status" text={label} icon={icon} />
      {children}
    </Detail.Metadata>
  )
}

/** The request, in a few lines of Markdown. */
const describeRequest = (values: FormValues): string => {
  const prompt = values.prompt.trim()
  const file = Option.orElse(pickedFile(values.image), () => pickedFile(values.video))

  const heading = Match.value(values.mode).pipe(
    Match.when("generate", () => "# New Video"),
    Match.when("edit", () => "# Edit a Video"),
    Match.orElse(() => "# Extend a Video"),
  )

  return [
    heading,
    "",
    prompt === "" ? "_No prompt. Grok works from the image alone._" : prompt,
    ...Option.match(file, {
      onNone: () => [],
      onSome: (path) => ["", `From **${basename(path)}**`],
    }),
  ].join("\n")
}

const unreadable = (message: string) => new VideoError({ reason: "failed", message, requestId: Option.none() })

/** Read a picked file, when xAI accepts its kind. */
const readMedia = Effect.fn("readMedia")(function* (path: string, kind: "image" | "video") {
  const type = yield* mediaTypeOf(path).pipe(
    Option.filter((media) => media.startsWith(`${kind}/`)),
    Option.match({
      onNone: () =>
        Effect.fail(
          unreadable(
            kind === "image"
              ? `${basename(path)} is not a JPEG, PNG, or WebP picture.`
              : `${basename(path)} is not an MP4 video.`,
          ),
        ),
      onSome: Effect.succeed,
    }),
  )

  const bytes = yield* Effect.tryPromise({
    try: () => readFile(path),
    catch: () => unreadable(`Could not read ${basename(path)}.`),
  })

  const file: MediaFile = { bytes: new Uint8Array(bytes), type }

  return file
})

const readPicked = (paths: Option.Option<ReadonlyArray<string>>, kind: "image" | "video") =>
  Option.match(pickedFile(paths), {
    onNone: () => Effect.succeed(Option.none<MediaFile>()),
    onSome: (path) => Effect.map(readMedia(path, kind), Option.some),
  })

/** The request to send for the form's values. The form already checked them. */
const requestFrom = Effect.fn("requestFrom")(function* (values: FormValues) {
  const prompt = values.prompt.trim()
  const isAspectRatio = isOneOf(ASPECT_RATIOS)
  const isResolution = isOneOf(RESOLUTIONS)

  return yield* Match.value(values.mode).pipe(
    Match.when("generate", () =>
      Effect.map(readPicked(values.image, "image"), (image) =>
        VideoRequest.Generate({
          prompt: Option.liftPredicate(prompt, (text) => text !== ""),
          image,
          duration: chosenSeconds(values.duration),
          aspectRatio: Option.filter(chosen(values.aspectRatio), isAspectRatio),
          resolution: Option.filter(chosen(values.resolution), isResolution),
        }),
      ),
    ),
    Match.orElse((mode) =>
      readPicked(values.video, "video").pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(unreadable("Choose an MP4 video.")),
            onSome: (video) =>
              Effect.succeed(
                mode === "edit"
                  ? VideoRequest.Edit({ prompt, video })
                  : VideoRequest.Extend({
                      prompt,
                      video,
                      duration: chosenSeconds(values.duration),
                    }),
              ),
          }),
        ),
      ),
    ),
  )
})

/** Download the MP4 to ~/Downloads and return its path. */
const saveToDownloads = Effect.fn("saveToDownloads")(function* (video: Video) {
  const bytes = yield* VideoGenerator.use((videos) => videos.download(video))

  const stamp = DateTime.formatIso(yield* DateTime.now)
    .replaceAll(":", "-")
    .slice(0, 19)

  const path = join(homedir(), "Downloads", `Grok Video ${stamp}.mp4`)
  yield* Effect.tryPromise({
    try: () => writeFile(path, bytes),
    catch: () => unreadable("Could not write the video to your Downloads folder."),
  })

  return path
})
