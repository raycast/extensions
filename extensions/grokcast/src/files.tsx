import { readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { basename, join } from "node:path"
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api"
import * as Arr from "effect/Array"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { useEffect, useState } from "react"
import {
  EXPIRY_CHOICES,
  GrokFiles,
  MacError,
  savedName,
  type FileList,
  type FilesError,
  type GrokFile,
} from "./lib/files.ts"
import { GrokRuntime } from "./lib/grok.ts"
import type { XaiFailure } from "./lib/xai.ts"

type State = Data.TaggedEnum<{
  Loading: {}
  Loaded: { readonly list: FileList }
  Failed: { readonly failure: XaiFailure }
}>
const State = Data.taggedEnum<State>()

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
const sizeFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

export default function Files() {
  const [state, setState] = useState<State>(State.Loading())
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const fiber = GrokRuntime.runFork(
      GrokFiles.use((files) => files.list).pipe(
        Effect.map((list) => State.Loaded({ list })),
        Effect.catchTag("FilesError", (failure) => Effect.succeed(State.Failed({ failure }))),
        Effect.flatMap((next) => Effect.sync(() => setState(next))),
      ),
    )
    return () => {
      GrokRuntime.runFork(Fiber.interrupt(fiber))
    }
  }, [attempt])

  const reload = () => setAttempt((count) => count + 1)

  /** Run a change with a progress toast, then reload the list. */
  const change = <A,>(
    title: string,
    program: Effect.Effect<A, FilesError, GrokFiles>,
    done: (result: A, toast: Toast) => Effect.Effect<void, FilesError | MacError>,
  ) => {
    setBusy(true)
    GrokRuntime.runFork(
      Effect.gen(function* () {
        const toast = yield* Effect.tryPromise(() =>
          showToast({ style: Toast.Style.Animated, title }),
        )
        yield* program.pipe(
          Effect.flatMap((result) => done(result, toast)),
          Effect.catch((error) =>
            Effect.sync(() => {
              toast.style = Toast.Style.Failure
              toast.title = "Something went wrong"
              toast.message = error.message
            }),
          ),
        )
      }).pipe(
        Effect.ignore,
        Effect.ensuring(
          Effect.sync(() => {
            setBusy(false)
            reload()
          }),
        ),
      ),
    )
  }

  const download = (file: GrokFile) =>
    change(
      `Downloading ${file.filename}`,
      GrokFiles.use((files) => files.download(file)),
      (downloaded, toast) =>
        saveToDownloads(downloaded.filename, downloaded.bytes).pipe(
          Effect.map((path) => {
            toast.style = Toast.Style.Success
            toast.title = `Saved ${basename(path)}`
            toast.message = "In your Downloads folder"
            toast.primaryAction = {
              title: "Show in Finder",
              onAction: () => void showInFinder(path),
            }
          }),
        ),
    )

  const share = (file: GrokFile, seconds: Option.Option<number>) =>
    change(
      "Making a public link",
      GrokFiles.use((files) => files.share(file.id, seconds)),
      (link, toast) =>
        Effect.tryPromise({
          try: () => Clipboard.copy(link.url),
          catch: () =>
            new MacError({
              message: "The link was made but not copied. Reload, then use Copy Public Link.",
            }),
        }).pipe(
          Effect.map(() => {
            toast.style = Toast.Style.Success
            toast.title = "Copied the public link"
            toast.message = Option.match(link.expiresAt, {
              onNone: () => "Anyone with the link can download the file.",
              onSome: (at) => `It works until ${dateFormat.format(at)}.`,
            })
          }),
        ),
    )

  const unshare = async (file: GrokFile) => {
    const confirmed = await confirmAlert({
      title: "Revoke the public link?",
      message: "The link stops working for everyone. The file stays.",
      primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
    })
    if (confirmed) {
      change(
        "Revoking the public link",
        GrokFiles.use((files) => files.unshare(file.id)),
        (_, toast) =>
          Effect.sync(() => {
            toast.style = Toast.Style.Success
            toast.title = "Revoked the public link"
          }),
      )
    }
  }

  const remove = async (file: GrokFile) => {
    const confirmed = await confirmAlert({
      title: `Delete ${file.filename}?`,
      message: "This deletes the file at xAI, and its public link stops working.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    })
    if (confirmed) {
      change(
        `Deleting ${file.filename}`,
        GrokFiles.use((files) => files.remove(file.id)),
        (_, toast) =>
          Effect.sync(() => {
            toast.style = Toast.Style.Success
            toast.title = `Deleted ${file.filename}`
          }),
      )
    }
  }

  const uploadAction = (
    <Action.Push
      title="Upload File"
      icon={Icon.Upload}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<UploadFile onUploaded={reload} />}
    />
  )

  const reloadAction = (
    <Action
      title="Reload"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={reload}
    />
  )

  return State.$match(state, {
    Loading: () => <List isLoading searchBarPlaceholder="Search files" />,
    Failed: ({ failure }) => (
      <List searchBarPlaceholder="Search files">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load your files"
          description={failure.message}
          actions={
            <ActionPanel>
              {failure.reason === "signIn" ? <SignInAction /> : null}
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setState(State.Loading())
                  reload()
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    ),
    Loaded: ({ list }) => (
      <List
        isLoading={busy}
        isShowingDetail={list.files.length > 0}
        searchBarPlaceholder="Search files"
      >
        <List.EmptyView
          icon={Icon.Document}
          title="No files yet"
          description="Upload a file to keep it at xAI, where Grok can use it."
          actions={
            <ActionPanel>
              {uploadAction}
              {reloadAction}
            </ActionPanel>
          }
        />
        <List.Section
          title={list.more ? `Newest ${list.files.length}` : undefined}
          subtitle={list.more ? "More files are not shown" : undefined}
        >
          {list.files.map((file) => (
            <List.Item
              key={file.id}
              title={file.filename}
              icon={Option.isSome(file.publicLink) ? Icon.Link : Icon.Document}
              keywords={[file.id]}
              detail={<FileDetail file={file} />}
              actions={
                <ActionPanel>
                  <Action title="Download" icon={Icon.Download} onAction={() => download(file)} />
                  {Option.match(file.publicLink, {
                    onNone: () => null,
                    onSome: (link) => (
                      <Action.CopyToClipboard
                        title="Copy Public Link"
                        content={link.url}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    ),
                  })}
                  <Action.CopyToClipboard title="Copy File ID" content={file.id} />
                  <ActionPanel.Submenu
                    title={
                      Option.isSome(file.publicLink)
                        ? "Make a New Public Link"
                        : "Create Public Link"
                    }
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                  >
                    {EXPIRY_CHOICES.map((choice) => (
                      <Action
                        key={choice.title}
                        title={
                          Option.isNone(choice.seconds) && Option.isSome(file.expiresAt)
                            ? "Until the File Expires"
                            : choice.title
                        }
                        onAction={() => share(file, choice.seconds)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  {Option.isSome(file.publicLink) ? (
                    <Action
                      title="Revoke Public Link"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={() => void unshare(file)}
                    />
                  ) : null}
                  <Action
                    title="Delete File"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => void remove(file)}
                  />
                  {uploadAction}
                  {reloadAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    ),
  })
}

function FileDetail({ file }: { readonly file: GrokFile }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={file.filename} />
          <List.Item.Detail.Metadata.Label title="Size" text={sizeOf(file.bytes)} />
          <List.Item.Detail.Metadata.Label
            title="Uploaded"
            text={dateFormat.format(file.createdAt)}
          />
          <List.Item.Detail.Metadata.Label
            title="Expires"
            text={Option.match(file.expiresAt, {
              onNone: () => "Never",
              onSome: (at) => dateFormat.format(at),
            })}
          />
          {Option.match(file.purpose, {
            onNone: () => null,
            onSome: (purpose) => <List.Item.Detail.Metadata.Label title="Purpose" text={purpose} />,
          })}
          <List.Item.Detail.Metadata.Separator />
          {Option.match(file.publicLink, {
            onNone: () => <List.Item.Detail.Metadata.Label title="Public Link" text="None" />,
            onSome: (link) => (
              <>
                <List.Item.Detail.Metadata.Link title="Public Link" text="Open" target={link.url} />
                <List.Item.Detail.Metadata.Label
                  title="Link Expires"
                  text={Option.match(link.expiresAt, {
                    onNone: () => "Never",
                    onSome: (at) => dateFormat.format(at),
                  })}
                />
              </>
            ),
          })}
          <List.Item.Detail.Metadata.Label title="File ID" text={file.id} />
        </List.Item.Detail.Metadata>
      }
    />
  )
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

/** The value of the "No Expiry" choice in the form's dropdown. */
const NO_EXPIRY = "none"

const expiryValue = (seconds: Option.Option<number>) =>
  Option.match(seconds, { onNone: () => NO_EXPIRY, onSome: String })

function UploadFile({ onUploaded }: { readonly onUploaded: () => void }) {
  const { pop } = useNavigation()
  const [paths, setPaths] = useState<Array<string>>([])
  const [expiry, setExpiry] = useState(NO_EXPIRY)
  const [uploading, setUploading] = useState(false)

  const upload = (path: string) => {
    setUploading(true)
    const filename = basename(path)
    const expiresAfter = Option.flatMap(
      Arr.findFirst(EXPIRY_CHOICES, (choice) => expiryValue(choice.seconds) === expiry),
      (choice) => choice.seconds,
    )
    GrokRuntime.runFork(
      Effect.gen(function* () {
        const toast = yield* Effect.tryPromise(() =>
          showToast({ style: Toast.Style.Animated, title: `Uploading ${filename}` }),
        )
        yield* Effect.tryPromise({
          try: () => readFile(path),
          catch: () => new MacError({ message: `Could not read ${filename}.` }),
        }).pipe(
          Effect.flatMap((bytes) =>
            GrokFiles.use((files) =>
              files.upload({ filename, bytes: new Uint8Array(bytes), expiresAfter }),
            ),
          ),
          Effect.flatMap(() =>
            Effect.sync(() => {
              toast.style = Toast.Style.Success
              toast.title = `Uploaded ${filename}`
              onUploaded()
              pop()
            }),
          ),
          Effect.catch((error) =>
            Effect.sync(() => {
              toast.style = Toast.Style.Failure
              toast.title = "Could not upload the file"
              toast.message = error.message
              setUploading(false)
            }),
          ),
        )
      }).pipe(Effect.ignore),
    )
  }

  return (
    <Form
      navigationTitle="Upload File"
      isLoading={uploading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Upload File"
            icon={Icon.Upload}
            onSubmit={() => Option.match(Arr.head(paths), { onNone: () => {}, onSome: upload })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Keep a file at xAI, where Grok can use it. Uploads count against your subscription's storage." />
      <Form.FilePicker
        id="file"
        title="File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={paths}
        onChange={setPaths}
        error={paths.length === 0 ? "Choose a file" : undefined}
      />
      <Form.Dropdown id="expiry" title="Delete After" value={expiry} onChange={setExpiry}>
        {EXPIRY_CHOICES.map((choice) => (
          <Form.Dropdown.Item
            key={choice.title}
            title={Option.isNone(choice.seconds) ? "Keep Until I Delete It" : choice.title}
            value={expiryValue(choice.seconds)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  )
}

/** Such as `12.3 MB`. */
const sizeOf = (bytes: number): string => {
  const units = ["bytes", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log10(Math.max(bytes, 1)) / 3), units.length - 1)
  return `${sizeFormat.format(bytes / 1000 ** exponent)} ${units[exponent]}`
}

const ErrorCode = Schema.Struct({ code: Schema.String })

/** True when a failed write found a file already there. */
const alreadyExists = (cause: unknown) =>
  Schema.decodeUnknownOption(ErrorCode)(cause).pipe(
    Option.exists((error) => error.code === "EEXIST"),
  )

/** Tries before giving up on a free name. */
const MAX_SAVE_ATTEMPTS = 100

/**
 * Save `bytes` in the Downloads folder and give the path. An existing file is never
 * replaced: the name gets " (1)", " (2)", and so on.
 */
const saveToDownloads = (filename: string, bytes: Uint8Array) => {
  const folder = join(homedir(), "Downloads")
  const failed = new MacError({
    message: `Could not save ${savedName(filename, 0)} in Downloads.`,
  })
  const attempt = (index: number): Effect.Effect<string, MacError> => {
    const path = join(folder, savedName(filename, index))
    return Effect.tryPromise({
      try: () => writeFile(path, bytes, { flag: "wx" }),
      catch: (cause) => ({ exists: alreadyExists(cause) }),
    }).pipe(
      Effect.as(path),
      Effect.catch((failure) =>
        failure.exists && index + 1 < MAX_SAVE_ATTEMPTS ? attempt(index + 1) : Effect.fail(failed),
      ),
    )
  }
  return attempt(0)
}
