// The views Generate Image, Edit Image, and Image History share: the prompt form, the
// grid of new images, and the actions on one image.

import { copyFile, readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { basename, extname, join } from "node:path"
import {
  Action,
  ActionPanel,
  Form,
  Grid,
  Icon,
  launchCommand,
  LaunchType,
  showHUD,
  showToast,
  Toast,
  useNavigation,
  type Keyboard,
} from "@raycast/api"
import * as Arr from "effect/Array"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Schema from "effect/Schema"
import { useEffect, useState, type ReactNode } from "react"
import { GrokRuntime } from "../lib/grok.ts"
import { ImageLibrary, type ImageEntry } from "../lib/image-library.ts"
import { nearestAspectRatio } from "../lib/image-size.ts"
import {
  AspectRatio,
  ImageError,
  ImageGenerator,
  MAX_IMAGE_COUNT,
  MAX_SOURCE_IMAGES,
  Resolution,
  SourceImage,
  type ImageRequest,
} from "../lib/images.ts"

/** Dropdown value for "let xAI choose". */
const XAI_DEFAULT = "default"

const ASPECT_RATIOS: ReadonlyArray<{ readonly value: AspectRatio; readonly title: string }> = [
  { value: "1:1", title: "Square (1:1)" },
  { value: "16:9", title: "Wide (16:9)" },
  { value: "9:16", title: "Tall (9:16)" },
  { value: "4:3", title: "Landscape (4:3)" },
  { value: "3:4", title: "Portrait (3:4)" },
  { value: "3:2", title: "Photo Landscape (3:2)" },
  { value: "2:3", title: "Photo Portrait (2:3)" },
]

/** The grid cell shape for an aspect ratio. The grid has no 1:1 name other than "1". */
const gridAspect = (ratio: Option.Option<AspectRatio>): Grid.AspectRatio =>
  Option.match(ratio, {
    onNone: () => "1",
    onSome: (value) =>
      Match.value(value).pipe(
        Match.when("1:1", () => "1" as const),
        Match.when("16:9", () => "16/9" as const),
        Match.when("9:16", () => "9/16" as const),
        Match.when("4:3", () => "4/3" as const),
        Match.when("3:4", () => "3/4" as const),
        Match.when("3:2", () => "3/2" as const),
        Match.when("2:3", () => "2/3" as const),
        Match.exhaustive,
      ),
  })

/**
 * The shape of the images Grok made, from the first image's pixel size. With xAI
 * Default, xAI picks the shape, so the requested ratio is only the fallback.
 */
const resultAspect = (
  entries: ReadonlyArray<ImageEntry>,
  requested: Option.Option<AspectRatio>,
): Option.Option<AspectRatio> =>
  Option.fromNullishOr(entries[0]).pipe(
    Option.flatMap(entryAspect),
    Option.orElse(() => requested),
  )

/** The aspect ratio of a saved image, from the pixel size it was saved with. */
const entryAspect = (entry: ImageEntry): Option.Option<AspectRatio> =>
  Option.zipWith(entry.width, entry.height, (width, height) =>
    nearestAspectRatio({ width, height }),
  )

/**
 * The cell shape for a grid of saved images: the shape most of them have. Images saved
 * before Grokcast kept pixel sizes do not count. With none known, the cells are square.
 */
export const libraryAspect = (entries: ReadonlyArray<ImageEntry>): Grid.AspectRatio => {
  const counts = Arr.reduce(
    Arr.getSomes(Arr.map(entries, entryAspect)),
    new Map<AspectRatio, number>(),
    (map, ratio) => map.set(ratio, (map.get(ratio) ?? 0) + 1),
  )
  return gridAspect(
    Option.map(
      Arr.head(
        Arr.sort(
          Array.from(counts),
          Order.mapInput(
            Order.flip(Order.Number),
            ([, count]: readonly [AspectRatio, number]) => count,
          ),
        ),
      ),
      ([ratio]) => ratio,
    ),
  )
}

const mimeTypeOf = (path: string): Option.Option<string> =>
  Match.value(extname(path).toLowerCase()).pipe(
    Match.when(".png", () => Option.some("image/png")),
    Match.when(".webp", () => Option.some("image/webp")),
    Match.whenOr(".jpg", ".jpeg", () => Option.some("image/jpeg")),
    Match.orElse(() => Option.none()),
  )

/** True for a file xAI can edit: JPEG, PNG, or WebP. */
export const isEditableImage = (path: string) => Option.isSome(mimeTypeOf(path))

const readSource = (path: string) =>
  Option.match(mimeTypeOf(path), {
    onNone: () =>
      Effect.fail(
        new ImageError({
          reason: "failed",
          message: `${basename(path)} is not a JPEG, PNG, or WebP image.`,
        }),
      ),
    onSome: (mimeType) =>
      Effect.tryPromise({
        try: () => readFile(path),
        catch: () =>
          new ImageError({ reason: "failed", message: `Could not read ${basename(path)}.` }),
      }).pipe(Effect.map((bytes) => new SourceImage({ bytes: new Uint8Array(bytes), mimeType }))),
  })

/** What the form asks for. `sources` are file paths. */
export interface ImageDraft {
  readonly prompt: string
  readonly aspectRatio: Option.Option<AspectRatio>
  readonly resolution: Option.Option<Resolution>
  readonly count: number
  readonly sources: ReadonlyArray<string>
}

const FormValues = Schema.Struct({
  prompt: Schema.String,
  aspectRatio: Schema.String,
  resolution: Schema.String,
  count: Schema.String,
  sources: Schema.optional(Schema.Array(Schema.String)),
})

const draftOf = (values: Form.Values): Option.Option<ImageDraft> =>
  Schema.decodeUnknownOption(FormValues)(values).pipe(
    Option.map((decoded) => ({
      prompt: decoded.prompt.trim(),
      aspectRatio: Schema.decodeUnknownOption(AspectRatio)(decoded.aspectRatio),
      resolution: Schema.decodeUnknownOption(Resolution)(decoded.resolution),
      count: Option.getOrElse(
        Option.liftPredicate(Number.parseInt(decoded.count, 10), Number.isFinite),
        () => 1,
      ),
      sources: decoded.sources ?? [],
    })),
  )

/**
 * The prompt form. With `edit`, it also asks for the images to edit. Submitting it
 * shows the new images.
 */
export function ImageForm({
  edit,
  initial,
}: {
  readonly edit: boolean
  readonly initial?: Partial<ImageDraft>
}) {
  const { push } = useNavigation()
  const [promptError, setPromptError] = useState<Option.Option<string>>(Option.none())
  const [sourcesError, setSourcesError] = useState<Option.Option<string>>(Option.none())

  const submit = (values: Form.Values) => {
    const draft = draftOf(values)
    if (Option.isNone(draft)) {
      return
    }
    const { prompt, sources } = draft.value
    if (prompt === "") {
      setPromptError(Option.some("Describe the image"))
      return
    }
    if (edit && sources.length === 0) {
      setSourcesError(Option.some("Choose an image to edit"))
      return
    }
    if (sources.length > MAX_SOURCE_IMAGES) {
      setSourcesError(Option.some(`Choose up to ${MAX_SOURCE_IMAGES} images`))
      return
    }
    if (!Arr.every(sources, isEditableImage)) {
      setSourcesError(Option.some("Choose JPEG, PNG, or WebP images"))
      return
    }
    push(<ImageResults draft={draft.value} />)
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={edit ? "Edit Image" : "Generate Image"}
            icon={edit ? Icon.Pencil : Icon.Image}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      {edit ? (
        <Form.FilePicker
          id="sources"
          title="Images"
          info={`Up to ${MAX_SOURCE_IMAGES} JPEG, PNG, or WebP images. With more than one, call them <IMAGE_0>, <IMAGE_1>, and so on in the prompt.`}
          allowMultipleSelection
          canChooseDirectories={false}
          defaultValue={[...(initial?.sources ?? [])]}
          error={Option.getOrUndefined(sourcesError)}
          onChange={() => setSourcesError(Option.none())}
        />
      ) : null}
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder={
          edit ? "Make it a watercolor painting at sunset" : "A red fox reading a map in the snow"
        }
        defaultValue={initial?.prompt}
        error={Option.getOrUndefined(promptError)}
        onChange={() => setPromptError(Option.none())}
      />
      <Form.Dropdown
        id="aspectRatio"
        title="Aspect Ratio"
        storeValue={initial?.aspectRatio === undefined}
        defaultValue={Option.getOrElse(initial?.aspectRatio ?? Option.none(), () => XAI_DEFAULT)}
      >
        <Form.Dropdown.Item value={XAI_DEFAULT} title="xAI Default" />
        {ASPECT_RATIOS.map((ratio) => (
          <Form.Dropdown.Item key={ratio.value} value={ratio.value} title={ratio.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="resolution"
        title="Resolution"
        storeValue={initial?.resolution === undefined}
        defaultValue={Option.getOrElse(initial?.resolution ?? Option.none(), () => XAI_DEFAULT)}
      >
        <Form.Dropdown.Item value={XAI_DEFAULT} title="xAI Default" />
        <Form.Dropdown.Item value="1k" title="1K" />
        <Form.Dropdown.Item value="2k" title="2K" />
      </Form.Dropdown>
      <Form.Dropdown id="count" title="Number of Images" storeValue defaultValue="1">
        {Arr.makeBy(MAX_IMAGE_COUNT, (index) => (
          <Form.Dropdown.Item key={index} value={String(index + 1)} title={String(index + 1)} />
        ))}
      </Form.Dropdown>
    </Form>
  )
}

type State = Data.TaggedEnum<{
  Working: {}
  Done: { readonly entries: ReadonlyArray<ImageEntry> }
  Failed: { readonly message: string; readonly signIn: boolean }
}>
const State = Data.taggedEnum<State>()

const create = (draft: ImageDraft) =>
  Effect.gen(function* () {
    const sources = yield* Effect.forEach(draft.sources, readSource)
    const request: ImageRequest = { ...draft, sources }
    const images = yield* ImageGenerator.use((generator) => generator.create(request))
    return yield* ImageLibrary.use((library) => library.add(request, images)).pipe(
      Effect.mapError(
        () =>
          new ImageError({ reason: "failed", message: "Could not save the image on this Mac." }),
      ),
    )
  })

/** Makes the images for `draft`, then shows them. */
export function ImageResults({ draft }: { readonly draft: ImageDraft }) {
  const [state, setState] = useState<State>(State.Working())
  const [attempt, setAttempt] = useState(0)
  const editing = draft.sources.length > 0

  useEffect(() => {
    const fiber = GrokRuntime.runFork(
      create(draft).pipe(
        Effect.tap((entries) => Effect.sync(() => setState(State.Done({ entries })))),
        Effect.catchTag("ImageError", (error) =>
          Effect.sync(() =>
            setState(State.Failed({ message: error.message, signIn: error.reason === "signIn" })),
          ),
        ),
      ),
    )
    return () => {
      GrokRuntime.runFork(Fiber.interrupt(fiber))
    }
  }, [attempt, draft])

  const again = (
    <Action
      title={editing ? "Edit Again" : "Generate Again"}
      icon={Icon.ArrowClockwise}
      shortcut={AGAIN_SHORTCUT}
      onAction={() => {
        setState(State.Working())
        setAttempt((count) => count + 1)
      }}
    />
  )

  return State.$match(state, {
    Working: () => (
      <Grid isLoading columns={2} searchBarPlaceholder={draft.prompt}>
        <Grid.EmptyView
          icon={Icon.Image}
          title={editing ? "Grok is editing the image" : "Grok is making the image"}
          description={draft.prompt}
        />
      </Grid>
    ),
    Failed: ({ message, signIn }) => (
      <Grid columns={2}>
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title={editing ? "The image was not edited" : "The image was not made"}
          description={message}
          actions={
            <ActionPanel>
              {signIn ? <SignInAction /> : again}
              {signIn ? again : null}
            </ActionPanel>
          }
        />
      </Grid>
    ),
    Done: ({ entries }) => (
      <Grid
        columns={entries.length === 1 ? 1 : 2}
        aspectRatio={gridAspect(resultAspect(entries, draft.aspectRatio))}
        fit={Grid.Fit.Contain}
        searchBarPlaceholder="Filter images"
      >
        {entries.map((entry) => (
          <ImageItem
            key={entry.id}
            entry={entry}
            extra={
              <>
                {again}
                <Action
                  title="Open Image History"
                  icon={Icon.Clock}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                  onAction={() =>
                    void launchCommand({ name: "image-history", type: LaunchType.UserInitiated })
                  }
                />
              </>
            }
          />
        ))}
      </Grid>
    ),
  })
}

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

const AGAIN_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd"], key: "r" }

/** Copy `entry`'s file into ~/Downloads. */
const saveToDownloads = (entry: ImageEntry) => {
  const target = join(homedir(), "Downloads", `grok-${basename(entry.path)}`)
  GrokRuntime.runFork(
    Effect.tryPromise(() => copyFile(entry.path, target)).pipe(
      Effect.andThen(Effect.tryPromise(() => showHUD(`Saved to Downloads as ${basename(target)}`))),
      Effect.catch(() =>
        Effect.tryPromise(() =>
          showToast({ style: Toast.Style.Failure, title: "Could not save to Downloads" }),
        ),
      ),
      Effect.ignore,
    ),
  )
}

/** One image in a grid, with the actions every grid offers and `extra` after them. */
export function ImageItem({
  entry,
  extra,
}: {
  readonly entry: ImageEntry
  readonly extra?: ReactNode
}) {
  return (
    <Grid.Item
      content={{ source: entry.path }}
      title={entry.prompt}
      keywords={[entry.prompt]}
      quickLook={{ path: entry.path, name: entry.prompt }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Image" content={{ file: entry.path }} />
            <Action.Paste title="Paste Image" content={{ file: entry.path }} />
            <Action.ToggleQuickLook />
            <Action
              title="Save to Downloads"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => saveToDownloads(entry)}
            />
            <Action.ShowInFinder path={entry.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
            <Action.Open
              title="Open Image"
              target={entry.path}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Edit with Grok"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<ImageForm edit initial={{ sources: [entry.path] }} />}
            />
            <Action.Push
              title="Reuse Prompt"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              target={
                <ImageForm
                  edit={false}
                  initial={{
                    prompt: entry.prompt,
                    aspectRatio: entry.aspectRatio,
                    resolution: entry.resolution,
                  }}
                />
              }
            />
            <Action.CopyToClipboard
              title="Copy Prompt"
              content={entry.prompt}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {extra}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}
