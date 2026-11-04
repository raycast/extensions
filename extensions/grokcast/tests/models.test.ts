import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import { ModelCatalog } from "../src/lib/models.ts"
import { StoredTokens } from "../src/lib/session.ts"
import { fakeFetch, json, memoryStore, NOW, testLayer, type FakeFetch } from "./support.ts"

const decodeJson = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown))

const signedIn = () =>
  memoryStore(
    new StoredTokens({
      accessToken: Redacted.make("a1"),
      refreshToken: Option.some(Redacted.make("r1")),
      idToken: Option.none(),
      expiresAt: NOW + 3_600_000,
    }),
  )

const runCatalog = <A, E>(
  fetch: FakeFetch,
  use: (catalog: ModelCatalog["Service"]) => Effect.Effect<A, E>,
) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(ModelCatalog.use(use)),
      Effect.provide(ModelCatalog.layer.pipe(Layer.provideMerge(testLayer(fetch, signedIn())))),
    ),
  )

const common = {
  object: "model",
  owned_by: "xai",
  fingerprint: "fp",
  input_modalities: ["text"],
}

const language = {
  ...common,
  id: "grok-4",
  aliases: ["grok-latest"],
  created: 1_700_000_000,
  version: "4.0",
  output_modalities: ["text"],
  capabilities: { reasoning_effort: ["low", "high"] },
  cached_prompt_text_token_price: 0,
  cached_prompt_text_token_price_long_context: 0,
  completion_text_token_price: 0,
  completion_text_token_price_long_context: 0,
  long_context_threshold: 0,
  prompt_image_token_price: 0,
  prompt_text_token_price: 0,
  prompt_text_token_price_long_context: 0,
  search_price: 0,
}

const image = {
  ...common,
  id: "grok-imagine-image",
  aliases: [],
  created: 1_750_000_000,
  version: "1",
  output_modalities: ["image"],
  image_price: 0,
  max_prompt_length: 1024,
}

const video = {
  ...common,
  id: "grok-imagine-video",
  aliases: [],
  created: 1_760_000_000,
  version: "1",
  output_modalities: ["video"],
}

const catalogFetch = (general: () => Response) =>
  fakeFetch((request) => {
    const path = new URL(request.url).pathname
    if (path.endsWith("/language-models")) return Response.json({ models: [language] })
    if (path.endsWith("/image-generation-models")) return Response.json({ models: [image] })
    if (path.endsWith("/video-generation-models")) return Response.json({ models: [video] })
    if (path.endsWith("/models")) return general()
    return json({ error: "unexpected" }, 404)
  })

describe("ModelCatalog.list", () => {
  it("lists language, image, and video models newest first, as the signed-in user", async () => {
    const fetch = catalogFetch(() =>
      Response.json({ object: "list", data: [{ ...language, context_length: 256_000 }] }),
    )
    const models = await runCatalog(fetch, (catalog) => catalog.list)
    assert.deepEqual(
      models.map((model) => [model.id, model.kind]),
      [
        ["grok-imagine-video", "video"],
        ["grok-imagine-image", "image"],
        ["grok-4", "language"],
      ],
    )
    const grok = models[2]
    assert.ok(grok)
    assert.deepEqual(grok.contextLength, Option.some(256_000))
    assert.deepEqual(grok.reasoningEfforts, ["low", "high"])
    assert.deepEqual(grok.aliases, ["grok-latest"])
    assert.equal(grok.created, 1_700_000_000_000)
    assert.deepEqual(models[1]?.maxPromptLength, Option.some(1024))
    assert.ok(
      fetch.requests.every((request) => request.headers.get("authorization") === "Bearer a1"),
    )
  })

  it("still lists the models when the general list fails, without context lengths", async () => {
    const models = await runCatalog(
      catalogFetch(() => json({ error: "nope" }, 500)),
      (catalog) => catalog.list,
    )
    assert.equal(models.length, 3)
    assert.ok(models.every((model) => Option.isNone(model.contextLength)))
  })

  it("asks the user to sign in again when xAI still refuses the token after a refresh", async () => {
    const error = await runCatalog(
      fakeFetch((request) =>
        request.url.endsWith("/oauth2/token")
          ? json({ access_token: "a2", refresh_token: "r2", expires_in: 21600 })
          : json({ error: "unauthorized" }, 401),
      ),
      (catalog) => Effect.flip(catalog.list),
    )
    assert.equal(error._tag, "ModelsError")
    assert.equal(error.reason, "signIn")
  })
})

describe("ModelCatalog.tokenize", () => {
  it("sends the model and text, and gives each token's ID and text", async () => {
    const fetch = fakeFetch(() =>
      Response.json({
        token_ids: [
          { token_id: 1, string_token: "Hello", token_bytes: [72] },
          { token_id: 2, string_token: " world", token_bytes: [32] },
        ],
      }),
    )
    const tokens = await runCatalog(fetch, (catalog) => catalog.tokenize("grok-4", "Hello world"))
    assert.deepEqual(
      tokens.map((token) => [token.id, token.text]),
      [
        [1, "Hello"],
        [2, " world"],
      ],
    )
    const request = fetch.requests[0]
    assert.ok(request)
    assert.ok(request.url.endsWith("/tokenize-text"))
    assert.deepEqual(decodeJson(request.body), { model: "grok-4", text: "Hello world" })
  })

  it("says when the usage limit is reached", async () => {
    const error = await runCatalog(
      fakeFetch(() => json({ error: "slow down" }, 429)),
      (catalog) => Effect.flip(catalog.tokenize("grok-4", "Hi")),
    )
    assert.equal(error.reason, "usageLimit")
  })
})
