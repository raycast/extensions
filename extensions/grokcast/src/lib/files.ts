// The files the signed-in user keeps at xAI, with the xAI SDK: list, upload,
// download, share, and delete. No Raycast imports, so tests run it under plain Node
// with a fake `fetch`.

import type { FileObject } from "@xai-official/sdk"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { callXai, describeXaiError, XaiClient, XaiFailureReason, type XaiSdkError } from "./xai.ts"

/** How long a list, share, or delete request may take. */
const REQUEST_TIMEOUT = Duration.seconds(30)

/** How long an upload or download may take. Files can be large. */
const TRANSFER_TIMEOUT = Duration.minutes(5)

/** Files per list request. */
const PAGE_SIZE = 100

/** At most this many pages are listed, so a large account stays quick to show. */
const MAX_PAGES = 5

/** A files request failed. `reason` picks what the UI offers, `message` is for the user. */
export class FilesError extends Schema.TaggedError<FilesError>()("FilesError", {
  reason: XaiFailureReason,
  message: Schema.String,
}) {}

/**
 * How long a file or public link lasts, in seconds. xAI accepts from 1 hour to 30
 * days. None keeps it until it is deleted or revoked.
 */
export const EXPIRY_CHOICES: ReadonlyArray<{
  readonly title: string
  readonly seconds: Option.Option<number>
}> = [
  { title: "No Expiry", seconds: Option.none() },
  { title: "1 Hour", seconds: Option.some(3600) },
  { title: "1 Day", seconds: Option.some(86_400) },
  { title: "7 Days", seconds: Option.some(604_800) },
  { title: "30 Days", seconds: Option.some(2_592_000) },
]

/** A link anyone can open to download a file. */
export class PublicLink extends Schema.Class<PublicLink>("PublicLink")({
  url: Schema.String,
  /** When the link stops working, in milliseconds since 1970. None when it does not expire. */
  expiresAt: Schema.Option(Schema.Finite),
}) {}

/** One file at xAI. */
export class GrokFile extends Schema.Class<GrokFile>("GrokFile")({
  id: Schema.String,
  filename: Schema.String,
  bytes: Schema.Finite,
  /** When it was uploaded, in milliseconds since 1970. */
  createdAt: Schema.Finite,
  /** When xAI deletes it, in milliseconds since 1970. None when it does not expire. */
  expiresAt: Schema.Option(Schema.Finite),
  /** Such as `assistants`. xAI does not interpret it. */
  purpose: Schema.Option(Schema.String),
  publicLink: Schema.Option(PublicLink),
}) {}

/** The files listed, newest first. `more` is true when xAI has more than were listed. */
export class FileList extends Schema.Class<FileList>("FileList")({
  files: Schema.Array(GrokFile),
  more: Schema.Boolean,
}) {}

/** A file's bytes, to save on this Mac. */
export class DownloadedFile extends Schema.Class<DownloadedFile>("DownloadedFile")({
  filename: Schema.String,
  bytes: Schema.Uint8Array,
}) {}

/** Something on this Mac failed, such as reading or saving a file. */
export class MacError extends Schema.TaggedError<MacError>()("MacError", {
  message: Schema.String,
}) {}

/**
 * The name for the `attempt`th try at saving `filename` in a folder: the name itself,
 * then "name (1).ext", "name (2).ext", and so on, so an existing file is never
 * replaced. A name with folders in it keeps only its last part.
 */
export const savedName = (filename: string, attempt: number): string => {
  const name = Option.getOrElse(
    Arr.last(
      filename.split(/[/\\]/).filter((part) => part !== "" && part !== "." && part !== ".."),
    ),
    () => "file",
  )
  if (attempt === 0) return name
  const dot = name.lastIndexOf(".")
  const [stem, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""]
  return `${stem} (${attempt})${extension}`
}

/** A file to upload. */
export interface UploadRequest {
  readonly filename: string
  readonly bytes: Uint8Array<ArrayBuffer>
  /** Seconds until xAI deletes the file. None keeps it. */
  readonly expiresAfter: Option.Option<number>
}

/** xAI gives times in seconds. */
const millis = (seconds: Option.Option<number>) => Option.map(seconds, (value) => value * 1000)

export const fromFileObject = (file: FileObject): GrokFile =>
  new GrokFile({
    id: file.id,
    filename: file.filename,
    bytes: file.bytes,
    createdAt: file.created_at * 1000,
    expiresAt: millis(Option.fromNullishOr(file.expires_at)),
    purpose: Option.filter(Option.fromNullishOr(file.purpose), (purpose) => purpose !== ""),
    publicLink: Option.map(
      Option.filter(Option.fromNullishOr(file.public_url), (url) => url !== ""),
      (url) =>
        new PublicLink({
          url,
          expiresAt: millis(Option.fromNullishOr(file.public_url_expires_at)),
        }),
    ),
  })

const toFilesError = (failed: string) => (error: XaiSdkError) =>
  new FilesError(describeXaiError(error, { feature: "files", failed }))

const makeFiles = Effect.fn("GrokFiles.make")(function* () {
  const { client } = yield* XaiClient

  const sdk = client.pipe(
    Effect.mapError((error) => new FilesError({ reason: "failed", message: error.message })),
  )
  const options = (signal: AbortSignal, timeout = REQUEST_TIMEOUT) => ({
    signal,
    maxRetries: 0,
    timeout: Duration.toMillis(timeout),
  })

  const page = (token: Option.Option<string>) =>
    Effect.flatMap(sdk, (xai) =>
      callXai((signal) =>
        xai.files.list(
          {
            limit: PAGE_SIZE,
            order: "desc",
            sort_by: "created_at",
            ...Option.match(token, {
              onNone: () => ({}),
              onSome: (pagination_token) => ({ pagination_token }),
            }),
          },
          options(signal),
        ),
      ).pipe(Effect.mapError(toFilesError("xAI could not list your files"))),
    )

  /** Pages from `token` on, until xAI has no more or `pagesLeft` runs out. */
  const pagesFrom = (
    token: Option.Option<string>,
    pagesLeft: number,
  ): Effect.Effect<FileList, FilesError> =>
    Effect.flatMap(page(token), (result) => {
      const files = Arr.map(result.data, fromFileObject)
      const next = Option.filter(
        Option.fromNullishOr(result.pagination_token),
        (value) => value !== "",
      )
      return Option.isSome(next) && pagesLeft > 1
        ? Effect.map(
            pagesFrom(next, pagesLeft - 1),
            (rest) => new FileList({ files: [...files, ...rest.files], more: rest.more }),
          )
        : Effect.succeed(new FileList({ files, more: Option.isSome(next) }))
    })

  const list = pagesFrom(Option.none(), MAX_PAGES).pipe(Effect.withSpan("GrokFiles.list"))

  const upload = Effect.fn("GrokFiles.upload")(function* (request: UploadRequest) {
    const xai = yield* sdk
    const result = yield* callXai((signal) =>
      xai.files.upload(
        {
          file: new Blob([request.bytes]),
          filename: request.filename,
          ...Option.match(request.expiresAfter, {
            onNone: () => ({}),
            onSome: (expires_after) => ({ expires_after }),
          }),
        },
        options(signal, TRANSFER_TIMEOUT),
      ),
    ).pipe(Effect.mapError(toFilesError("xAI could not upload the file")))
    return fromFileObject(result)
  })

  const download = Effect.fn("GrokFiles.download")(function* (file: GrokFile) {
    const xai = yield* sdk
    const bytes = yield* callXai(async (signal) => {
      const response = await xai.files.content(file.id, {}, options(signal, TRANSFER_TIMEOUT))
      return response.bytes()
    }).pipe(Effect.mapError(toFilesError("xAI could not download the file")))
    return new DownloadedFile({ filename: file.filename, bytes })
  })

  const share = Effect.fn("GrokFiles.share")(function* (
    id: string,
    expiresAfter: Option.Option<number>,
  ) {
    const xai = yield* sdk
    const result = yield* callXai((signal) =>
      xai.files.createPublicUrl(
        id,
        Option.match(expiresAfter, {
          onNone: () => ({}),
          onSome: (expires_after) => ({ expires_after }),
        }),
        options(signal),
      ),
    ).pipe(Effect.mapError(toFilesError("xAI could not make a public link")))
    return new PublicLink({
      url: result.public_url,
      expiresAt: millis(Option.fromNullishOr(result.expires_at)),
    })
  })

  const unshare = Effect.fn("GrokFiles.unshare")(function* (id: string) {
    const xai = yield* sdk
    yield* callXai((signal) => xai.files.revokePublicUrl(id, options(signal))).pipe(
      Effect.mapError(toFilesError("xAI could not revoke the public link")),
    )
  })

  const remove = Effect.fn("GrokFiles.remove")(function* (id: string) {
    const xai = yield* sdk
    yield* callXai((signal) => xai.files.delete(id, options(signal))).pipe(
      Effect.mapError(toFilesError("xAI could not delete the file")),
    )
  })

  return GrokFiles.of({ list, upload, download, share, unshare, remove })
})

export class GrokFiles extends Context.Service<
  GrokFiles,
  {
    /** The newest files, up to `MAX_PAGES` pages of them. */
    readonly list: Effect.Effect<FileList, FilesError>
    readonly upload: (request: UploadRequest) => Effect.Effect<GrokFile, FilesError>
    readonly download: (file: GrokFile) => Effect.Effect<DownloadedFile, FilesError>
    /** Make a public link to file `id`. None for `expiresAfter` keeps the file's own expiry, if any. */
    readonly share: (
      id: string,
      expiresAfter: Option.Option<number>,
    ) => Effect.Effect<PublicLink, FilesError>
    /** Stop file `id`'s public link from working. */
    readonly unshare: (id: string) => Effect.Effect<void, FilesError>
    readonly remove: (id: string) => Effect.Effect<void, FilesError>
  }
>()("grokcast/GrokFiles") {
  static readonly layer = Layer.effect(GrokFiles, makeFiles())
}
