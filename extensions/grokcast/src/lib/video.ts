// Video generation with the xAI SDK, as the signed-in user: start a job (from text,
// an image, or a video to edit or extend), then poll it until the video is ready.
// No Raycast imports, so tests run it under plain Node with a fake `fetch`.

import type { VideoEditParams, VideoExtendParams, VideoGenerateParams } from "@xai-official/sdk"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { callXai, describeXaiError, XaiClient, XaiFailureReason, type XaiSdkError } from "./xai.ts"

/** How often to ask xAI whether the video is ready. The SDK's own `wait` uses the same. */
export const POLL_INTERVAL = Duration.seconds(5)

/** Stop waiting after this long. The job keeps running at xAI, and the user can check again. */
export const MAX_WAIT = Duration.minutes(10)

/** How long one request to start or check a job may take. Images and videos are sent inline. */
const REQUEST_TIMEOUT = Duration.minutes(2)

/** Video generation failed. `reason` picks what the UI offers, `message` is for the user. */
export class VideoError extends Schema.TaggedError<VideoError>()("VideoError", {
  reason: XaiFailureReason,
  message: Schema.String,
  /** Set when the job may still finish at xAI, so the user can check it again. */
  requestId: Schema.Option(Schema.String),
}) {}

export const ASPECT_RATIOS = [
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "21:9",
  "5:2",
] as const
export type AspectRatio = (typeof ASPECT_RATIOS)[number]

export const RESOLUTIONS = ["480p", "720p", "1080p"] as const
export type Resolution = (typeof RESOLUTIONS)[number]

/** A picture or video from disk. `type` is its media type, such as `image/png`. */
export interface MediaFile {
  readonly bytes: Uint8Array<ArrayBuffer>
  readonly type: string
}

/**
 * What to make. Every setting left as None uses xAI's default, and the model is
 * never set, so xAI's current video model and its upgrades apply.
 */
export type VideoRequest = Data.TaggedEnum<{
  /** From a prompt, or from an image that becomes the first frame (the prompt is then optional). */
  Generate: {
    readonly prompt: Option.Option<string>
    readonly image: Option.Option<MediaFile>
    /** Seconds, 1 to 15. xAI's default is 8. */
    readonly duration: Option.Option<number>
    readonly aspectRatio: Option.Option<AspectRatio>
    readonly resolution: Option.Option<Resolution>
  }
  /** Change an MP4 as the prompt says. */
  Edit: { readonly prompt: string; readonly video: MediaFile }
  /** Continue an MP4 of 2 to 15 seconds as the prompt says. */
  Extend: {
    readonly prompt: string
    readonly video: MediaFile
    /** Seconds to add, 2 to 10. xAI's default is 6. */
    readonly duration: Option.Option<number>
  }
}>
export const VideoRequest = Data.taggedEnum<VideoRequest>()

export class Video extends Schema.Class<Video>("Video")({
  /** A temporary link to the MP4 at xAI. */
  url: Schema.String,
  seconds: Schema.Finite,
  /** The model xAI used. None when xAI did not say. */
  model: Schema.Option(Schema.String),
}) {}

export type VideoStatus = Data.TaggedEnum<{
  /** `progress` is 0 to 99 when xAI reports it. */
  Pending: { readonly progress: Option.Option<number> }
  Done: { readonly video: Video }
}>
export const VideoStatus = Data.taggedEnum<VideoStatus>()

/** The parts of the SDK's `VideoResponse` that Grokcast reads. */
const VideoResponse = Schema.Struct({
  status: Schema.String,
  progress: Schema.OptionFromOptionalNullOr(Schema.Finite),
  model: Schema.OptionFromOptionalNullOr(Schema.String),
  error: Schema.OptionFromOptionalNullOr(
    Schema.Struct({ code: Schema.String, message: Schema.String }),
  ),
  video: Schema.OptionFromOptionalNullOr(
    Schema.Struct({
      url: Schema.OptionFromOptionalNullOr(Schema.String),
      duration: Schema.Finite,
      respect_moderation: Schema.Boolean,
    }),
  ),
})
type VideoResponse = typeof VideoResponse.Type

const wording = { feature: "video generation", failed: "xAI could not make the video" }

const fromSdk = (error: XaiSdkError) =>
  new VideoError({ ...describeXaiError(error, wording), requestId: Option.none() })

const failed = (message: string) =>
  new VideoError({ reason: "failed", message, requestId: Option.none() })

/** What a finished job's response means: the video, or why there is none. */
const toStatus = (response: VideoResponse): Effect.Effect<VideoStatus, VideoError> =>
  Match.value(response.status).pipe(
    Match.when("pending", () =>
      Effect.succeed(VideoStatus.Pending({ progress: response.progress })),
    ),
    Match.when("done", () =>
      Option.match(response.video, {
        onNone: () => Effect.fail(failed("xAI finished the job but sent no video.")),
        onSome: (video) =>
          Option.match(
            Option.filter(video.url, (url) => video.respect_moderation && url !== ""),
            {
              onNone: () =>
                Effect.fail(
                  failed("Grok's moderation blocked this video. Try a different prompt or image."),
                ),
              onSome: (url) =>
                Effect.succeed(
                  VideoStatus.Done({
                    video: new Video({ url, seconds: video.duration, model: response.model }),
                  }),
                ),
            },
          ),
      }),
    ),
    Match.when("expired", () =>
      Effect.fail(failed("The video expired at xAI before it was picked up. Make it again.")),
    ),
    Match.orElse(() =>
      Effect.fail(
        failed(
          Option.match(response.error, {
            onNone: () => "xAI could not make the video.",
            onSome: (error) => `xAI could not make the video: ${error.message}`,
          }),
        ),
      ),
    ),
  )

/**
 * The SDK's types require `model`, but the API treats it as optional and then uses
 * xAI's current model. Grokcast leaves it out so xAI's default and upgrades apply.
 */
const withXaiDefaultModel = <Params extends { readonly model: string }>(
  params: Omit<Params, "model">,
): Params =>
  // SAFETY: only `model` is missing, the API accepts a request without it, and the
  // SDK sends the body as given (it only inlines Blobs as data URLs).
  params as Params

const blobOf = (file: MediaFile) => new Blob([file.bytes], { type: file.type })

/** The media types xAI accepts, by file extension: JPEG, PNG, or WebP images, and MP4 videos. */
const MEDIA_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
} as const satisfies Record<string, string>

/** The media type of `path`, when xAI accepts that kind of file. */
export const mediaTypeOf = (path: string): Option.Option<string> => {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase()
  return Option.fromNullishOr(Object.entries(MEDIA_TYPES).find(([key]) => key === extension)?.[1])
}

/** A text bar for `progress` (0 to 100), such as `████░░░░`. */
export const progressBar = (progress: number, steps = 20): string => {
  const filled = Math.round((Math.min(100, Math.max(0, progress)) / 100) * steps)
  return "█".repeat(filled) + "░".repeat(steps - filled)
}

const makeVideoGenerator = Effect.fn("VideoGenerator.make")(function* () {
  const xai = yield* XaiClient
  const http = yield* HttpClient.HttpClient

  const sdk = <A>(
    call: (client: Effect.Success<typeof xai.client>, signal: AbortSignal) => Promise<A>,
  ) =>
    xai.client.pipe(
      Effect.mapError((error) => failed(error.message)),
      Effect.flatMap((client) =>
        callXai((signal) => call(client, signal)).pipe(Effect.mapError(fromSdk)),
      ),
    )

  // A 429 is usually the plan's usage limit, so say so at once instead of retrying.
  const options = (signal: AbortSignal) => ({
    signal,
    maxRetries: 0,
    timeout: Duration.toMillis(REQUEST_TIMEOUT),
  })

  const start = Effect.fn("VideoGenerator.start")(function* (request: VideoRequest) {
    const started = yield* VideoRequest.$match(request, {
      Generate: ({ prompt, image, duration, aspectRatio, resolution }) =>
        sdk((client, signal) =>
          client.videos.generate(
            withXaiDefaultModel<VideoGenerateParams>({
              prompt: Option.getOrUndefined(prompt),
              image: Option.getOrUndefined(Option.map(image, blobOf)),
              duration: Option.getOrUndefined(duration),
              aspect_ratio: Option.getOrUndefined(aspectRatio),
              resolution: Option.getOrUndefined(resolution),
            }),
            options(signal),
          ),
        ),
      Edit: ({ prompt, video }) =>
        sdk((client, signal) =>
          client.videos.edit(
            withXaiDefaultModel<VideoEditParams>({ prompt, video: blobOf(video) }),
            options(signal),
          ),
        ),
      Extend: ({ prompt, video, duration }) =>
        sdk((client, signal) =>
          client.videos.extend(
            withXaiDefaultModel<VideoExtendParams>({
              prompt,
              video: blobOf(video),
              duration: Option.getOrUndefined(duration),
            }),
            options(signal),
          ),
        ),
    })
    return started.request_id
  })

  const status = Effect.fn("VideoGenerator.status")(function* (requestId: string) {
    const response = yield* sdk((client, signal) => client.videos.get(requestId, options(signal)))
    const decoded = yield* Schema.decodeUnknownEffect(VideoResponse)(response).pipe(
      Effect.mapError(() => failed("xAI sent a video status Grokcast could not read.")),
    )
    return yield* toStatus(decoded)
  })

  const stillRunning = (requestId: string) =>
    new VideoError({
      reason: "network",
      message:
        "The video is taking longer than usual. It may still finish at xAI, so check again later.",
      requestId: Option.some(requestId),
    })

  const follow = Effect.fn("VideoGenerator.follow")(function* (
    requestId: string,
    onPending: (progress: Option.Option<number>) => Effect.Effect<void>,
  ) {
    const last = yield* Stream.fromEffectSchedule(
      status(requestId),
      Schedule.spaced(POLL_INTERVAL),
    ).pipe(
      Stream.tap((current) =>
        VideoStatus.$match(current, {
          Pending: ({ progress }) => onPending(progress),
          Done: () => Effect.void,
        }),
      ),
      Stream.takeUntil(VideoStatus.$is("Done")),
      Stream.runLast,
      Effect.timeoutOrElse({
        duration: MAX_WAIT,
        orElse: () => Effect.fail(stillRunning(requestId)),
      }),
    )
    return yield* last.pipe(
      Option.flatMap(Option.liftPredicate(VideoStatus.$is("Done"))),
      Option.match({
        onNone: () => Effect.fail(stillRunning(requestId)),
        onSome: (done) => Effect.succeed(done.video),
      }),
    )
  })

  const generate = Effect.fn("VideoGenerator.generate")(function* (
    request: VideoRequest,
    onPending: (progress: Option.Option<number>) => Effect.Effect<void>,
  ) {
    const requestId = yield* start(request)
    yield* onPending(Option.none())
    return yield* follow(requestId, onPending)
  })

  /** The MP4 at `video.url`. The link is public and temporary, so no token is sent. */
  const download = Effect.fn("VideoGenerator.download")(function* (video: Video) {
    return yield* http.get(video.url).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap((response) => response.arrayBuffer),
      Effect.map((buffer) => new Uint8Array(buffer)),
      Effect.mapError(
        () =>
          new VideoError({
            reason: "network",
            message: "Could not download the video from xAI. The link may have expired.",
            requestId: Option.none(),
          }),
      ),
    )
  })

  return VideoGenerator.of({ start, status, follow, generate, download })
})

export class VideoGenerator extends Context.Service<
  VideoGenerator,
  {
    /** Start a job and return its request ID. */
    readonly start: (request: VideoRequest) => Effect.Effect<string, VideoError>
    /** Ask once how the job is going. */
    readonly status: (requestId: string) => Effect.Effect<VideoStatus, VideoError>
    /**
     * Poll every `POLL_INTERVAL` until the video is ready, calling `onPending` with each
     * progress report. After `MAX_WAIT`, fails with the request ID so the user can check again.
     */
    readonly follow: (
      requestId: string,
      onPending: (progress: Option.Option<number>) => Effect.Effect<void>,
    ) => Effect.Effect<Video, VideoError>
    /** `start`, then `follow`. */
    readonly generate: (
      request: VideoRequest,
      onPending: (progress: Option.Option<number>) => Effect.Effect<void>,
    ) => Effect.Effect<Video, VideoError>
    readonly download: (video: Video) => Effect.Effect<Uint8Array<ArrayBuffer>, VideoError>
  }
>()("grokcast/VideoGenerator") {
  static readonly layer = Layer.effect(VideoGenerator, makeVideoGenerator())
}
