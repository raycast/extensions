import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  DEFAULT_ORIGIN,
  apiKeysUrl,
  apiUrl,
  documentUrl,
  normalizeOrigin,
  pricingUrl,
  worldUrl,
} from "./urls.ts"

describe("normalizeOrigin", () => {
  it("falls back to vvd.world for an empty preference", () => {
    assert.equal(normalizeOrigin(undefined), DEFAULT_ORIGIN)
    assert.equal(normalizeOrigin(""), DEFAULT_ORIGIN)
    assert.equal(normalizeOrigin("   "), DEFAULT_ORIGIN)
  })

  it("strips trailing slashes and whitespace", () => {
    assert.equal(
      normalizeOrigin(" https://beta.vvd.world/ "),
      "https://beta.vvd.world",
    )
    assert.equal(
      normalizeOrigin("http://localhost:3000//"),
      "http://localhost:3000",
    )
  })

  it("assumes https when the scheme is missing", () => {
    assert.equal(normalizeOrigin("beta.vvd.world"), "https://beta.vvd.world")
  })
})

describe("app urls", () => {
  const origin = "https://vvd.world"

  it("builds the world and document routes the web app uses", () => {
    assert.equal(
      worldUrl(origin, "eldermoor"),
      "https://vvd.world/worlds/eldermoor",
    )
    assert.equal(
      documentUrl(origin, "eldermoor", "doc-1"),
      "https://vvd.world/worlds/eldermoor/editor?doc=doc-1",
    )
  })

  it("encodes a slug or id that carries reserved characters", () => {
    assert.equal(
      worldUrl(origin, "a b/c"),
      "https://vvd.world/worlds/a%20b%2Fc",
    )
  })

  it("points at the settings and pricing pages", () => {
    assert.equal(apiKeysUrl(origin), "https://vvd.world/settings/api-keys")
    assert.equal(pricingUrl(origin), "https://vvd.world/pricing")
  })
})

describe("apiUrl", () => {
  it("prefixes /api/v1 and accepts a path with or without a leading slash", () => {
    assert.equal(
      apiUrl("https://vvd.world", "/worlds"),
      "https://vvd.world/api/v1/worlds",
    )
    assert.equal(
      apiUrl("https://vvd.world", "me"),
      "https://vvd.world/api/v1/me",
    )
  })

  it("serializes a query and drops undefined values", () => {
    assert.equal(
      apiUrl("https://vvd.world", "/worlds/w1/search", {
        q: "sir reginald",
        limit: 20,
        documentType: undefined,
      }),
      "https://vvd.world/api/v1/worlds/w1/search?q=sir+reginald&limit=20",
    )
    assert.equal(
      apiUrl("https://vvd.world", "/worlds", {}),
      "https://vvd.world/api/v1/worlds",
    )
  })
})
