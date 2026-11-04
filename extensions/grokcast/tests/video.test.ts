import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Arr from "effect/Array"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import { StoredTokens } from "../src/lib/session.ts"
import {
  MAX_WAIT,
  mediaTypeOf,
  POLL_INTERVAL,
  progressBar,
  VideoGenerator,
  Video,
  VideoRequest,
  type VideoError,
} from "../src/lib/video.ts"
import { fakeFetch, memoryStore, NOW, testLayer, type FakeFetch } from "./support.ts"

const signedIn = () =>
  memoryStore(
    new StoredTokens({
      accessToken: Redacted.make("a1"),
      refreshToken: Option.some(Redacted.make("r1")),
      idToken: Option.none(),
      expiresAt: NOW + 3_600_000,
    }),
  )

const fromText = VideoRequest.Generate({
  prompt: Option.some("A cat surfing at sunset"),
  image: Option.none(),
  duration: Option.none(),
  aspectRatio: Option.none(),
  resolution: Option.none(),
})

const mp4 = { bytes: new Uint8Array([0, 0, 0, 24]), type: "video/mp4" }

const Body = Schema.Record(Schema.String, Schema.Unknown)
/** The JSON body of the request at `index`. */
const bodyOf = (fetch: FakeFetch, index = 0) =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Body))(
    Arr.get(fetch.requests, index).pipe(
      Option.map((request) => request.body),
      Option.getOrElse(() => ""),
    ),
  )

/** What xAI's video endpoints answer with, in the parts these tests use. */
interface WireBody {
  readonly request_id?: string
  readonly status?: string
  readonly progress?: number
  readonly model?: string
  readonly error?: string | { readonly code: string; readonly message: string }
  readonly video?: {
    readonly url: string
    readonly duration: number
    readonly respect_moderation: boolean
  }
}

const answer = (body: WireBody, status = 200) => Response.json(body, { status })
const started = () => answer({ request_id: "req-1" })
const done: WireBody = {
  status: "done",
  model: "grok-imagine-video",
  progress: 100,
  video: { url: "https://vidgen.x.ai/req-1.mp4", duration: 8, respect_moderation: true },
}

/** Answers the start request, then the polls in `polls` (the last one repeats). */
const job = (polls: ReadonlyArray<() => Response>) =>
  fakeFetch((request, index) =>
    request.method === "POST"
      ? started()
      : (polls[Math.min(index - 1, polls.length - 1)] ?? (() => answer(done)))(),
  )

/** Let the fake fetch's promises settle between clock steps. */
const settle = Effect.tryPromise(() => new Promise<void>((resolve) => setImmediate(resolve))).pipe(
  Effect.orDie,
)

const layer = (fetch: FakeFetch) =>
  VideoGenerator.layer.pipe(Layer.provideMerge(testLayer(fetch, signedIn())))

/**
 * Run `generate` and step the test clock one poll at a time until it ends.
 * Returns the video or the error, and every progress report.
 */
const generate = (fetch: FakeFetch, request: VideoRequest = fromText) =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* TestClock.setTime(NOW)
      const reports: Array<Option.Option<number>> = []
      const fiber = yield* Effect.forkChild(
        Effect.result(
          VideoGenerator.use((videos) =>
            videos.generate(request, (progress) => Effect.sync(() => reports.push(progress))),
          ),
        ),
      )
      const steps = Duration.toMillis(MAX_WAIT) / Duration.toMillis(POLL_INTERVAL) + 2
      yield* Effect.forEach(
        Array.from({ length: steps }),
        () => settle.pipe(Effect.andThen(TestClock.adjust(POLL_INTERVAL)), Effect.andThen(settle)),
        { discard: true },
      )
      return { result: yield* Fiber.join(fiber), reports }
    }).pipe(Effect.provide(layer(fetch))),
  )

const errorOf = async (fetch: FakeFetch, request?: VideoRequest): Promise<VideoError> => {
  const { result } = await generate(fetch, request)
  assert.equal(result._tag, "Failure", "expected a failure")
  return result._tag === "Failure" ? result.failure : assert.fail()
}

describe("VideoGenerator.generate", () => {
  it("starts a job without a model, polls until it is done, and reports progress", async () => {
    const fetch = job([
      () => new Response(null, { status: 202 }),
      () => answer({ status: "pending", progress: 40 }),
      () => answer(done),
    ])
    const { result, reports } = await generate(fetch)
    assert.equal(result._tag, "Success")
    const video = result._tag === "Success" ? result.success : assert.fail()
    assert.equal(video.url, "https://vidgen.x.ai/req-1.mp4")
    assert.equal(video.seconds, 8)
    assert.deepEqual(video.model, Option.some("grok-imagine-video"))
    assert.deepEqual(reports, [Option.none(), Option.none(), Option.some(40)])

    const [start, ...polls] = fetch.requests
    assert.equal(start?.url, "https://api.x.ai/v1/videos/generations")
    assert.equal(start?.headers.get("authorization"), "Bearer a1")
    assert.deepEqual(bodyOf(fetch), { prompt: "A cat surfing at sunset" })
    assert.equal(polls.length, 3)
    assert.ok(polls.every((poll) => poll.url === "https://api.x.ai/v1/videos/req-1"))
  })

  it("sends the chosen settings and an image as a data URL", async () => {
    const fetch = job([() => answer(done)])
    await generate(
      fetch,
      VideoRequest.Generate({
        prompt: Option.none(),
        image: Option.some({ bytes: new Uint8Array([1, 2, 3]), type: "image/png" }),
        duration: Option.some(5),
        aspectRatio: Option.some("9:16"),
        resolution: Option.some("720p"),
      }),
    )
    assert.deepEqual(bodyOf(fetch), {
      image: { url: "data:image/png;base64,AQID" },
      duration: 5,
      aspect_ratio: "9:16",
      resolution: "720p",
    })
  })

  it("edits and extends an MP4", async () => {
    const edit = job([() => answer(done)])
    await generate(edit, VideoRequest.Edit({ prompt: "Make it snow", video: mp4 }))
    assert.equal(edit.requests[0]?.url, "https://api.x.ai/v1/videos/edits")
    assert.deepEqual(bodyOf(edit), {
      prompt: "Make it snow",
      video: { url: "data:video/mp4;base64,AAAAGA==" },
    })

    const extend = job([() => answer(done)])
    await generate(
      extend,
      VideoRequest.Extend({ prompt: "The cat waves", video: mp4, duration: Option.some(4) }),
    )
    assert.equal(extend.requests[0]?.url, "https://api.x.ai/v1/videos/extensions")
    assert.deepEqual(bodyOf(extend), {
      prompt: "The cat waves",
      video: { url: "data:video/mp4;base64,AAAAGA==" },
      duration: 4,
    })
  })

  it("passes on xAI's reason when the job fails", async () => {
    const error = await errorOf(
      job([
        () =>
          answer({
            status: "failed",
            error: { code: "invalid_argument", message: "The image is too small." },
          }),
      ]),
    )
    assert.equal(error.reason, "failed")
    assert.match(error.message, /The image is too small\./)
    assert.ok(Option.isNone(error.requestId))
  })

  it("says when moderation blocked the video", async () => {
    const error = await errorOf(
      job([
        () =>
          answer({
            status: "done",
            video: { url: "", duration: 8, respect_moderation: false },
          }),
      ]),
    )
    assert.match(error.message, /moderation/)
  })

  it("says when the result expired", async () => {
    const error = await errorOf(job([() => answer({ status: "expired" })]))
    assert.match(error.message, /expired/)
  })

  it("stops waiting after MAX_WAIT and keeps the request ID to check again", async () => {
    const error = await errorOf(job([() => answer({ status: "pending", progress: 10 })]))
    assert.equal(error.reason, "network")
    assert.deepEqual(error.requestId, Option.some("req-1"))
  })

  it("explains a 403 as the plan and a 429 as the usage limit, without retrying", async () => {
    const plan = await errorOf(fakeFetch(() => answer({ error: "forbidden" }, 403)))
    assert.equal(plan.reason, "plan")
    assert.match(plan.message, /video generation/)
    const limited = fakeFetch(() => answer({ error: "rate limited" }, 429))
    const limit = await errorOf(limited)
    assert.equal(limit.reason, "usageLimit")
    assert.equal(limited.requests.length, 1)
  })

  it("asks the user to sign in when nobody is signed in, without calling xAI", async () => {
    const fetch = job([() => answer(done)])
    const error = await Effect.runPromise(
      TestClock.setTime(NOW).pipe(
        Effect.andThen(Effect.flip(VideoGenerator.use((videos) => videos.start(fromText)))),
        Effect.provide(VideoGenerator.layer.pipe(Layer.provideMerge(testLayer(fetch)))),
      ),
    )
    assert.equal(error.reason, "signIn")
    assert.equal(fetch.requests.length, 0)
  })
})

describe("VideoGenerator.download", () => {
  it("downloads the MP4 without sending the Grok token", async () => {
    const fetch = fakeFetch(() => new Response(new Uint8Array([7, 8, 9])))
    const bytes = await Effect.runPromise(
      VideoGenerator.use((videos) =>
        videos.download(
          new Video({ url: "https://vidgen.x.ai/req-1.mp4", seconds: 8, model: Option.none() }),
        ),
      ).pipe(Effect.provide(layer(fetch))),
    )
    assert.deepEqual([...bytes], [7, 8, 9])
    const last = fetch.requests.at(-1)
    assert.equal(last?.url, "https://vidgen.x.ai/req-1.mp4")
    assert.equal(last?.headers.get("authorization"), null)
  })
})

describe("video helpers", () => {
  it("knows the media types xAI accepts", () => {
    assert.deepEqual(mediaTypeOf("/Users/me/Cat.PNG"), Option.some("image/png"))
    assert.deepEqual(mediaTypeOf("clip.mp4"), Option.some("video/mp4"))
    assert.deepEqual(mediaTypeOf("photo.heic"), Option.none())
    assert.deepEqual(mediaTypeOf("README"), Option.none())
  })

  it("draws a progress bar", () => {
    assert.equal(progressBar(0, 4), "░░░░")
    assert.equal(progressBar(50, 4), "██░░")
    assert.equal(progressBar(140, 4), "████")
  })
})
