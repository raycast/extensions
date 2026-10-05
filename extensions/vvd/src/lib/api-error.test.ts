import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  NotConnectedError,
  VvdApiError,
  describeError,
  errorFromResponse,
} from "./api-error.ts"

describe("errorFromResponse", () => {
  it("reads the platform envelope", () => {
    const err = errorFromResponse(403, {
      error: "This needs a Pro plan.",
      code: "UPGRADE_REQUIRED",
      details: { plan: "free" },
    })
    assert.ok(err instanceof VvdApiError)
    assert.equal(err.status, 403)
    assert.equal(err.code, "UPGRADE_REQUIRED")
    assert.equal(err.message, "This needs a Pro plan.")
    assert.deepEqual(err.details, { plan: "free" })
  })

  it("survives a body that is not the envelope", () => {
    assert.equal(
      errorFromResponse(502, "<html>").message,
      "The vvd API answered 502",
    )
    assert.equal(errorFromResponse(500, null).code, undefined)
    assert.equal(
      errorFromResponse(500, { error: 12 }).message,
      "The vvd API answered 500",
    )
  })
})

describe("describeError", () => {
  it("treats a missing key and a rejected key as the same recovery", () => {
    assert.equal(describeError(new NotConnectedError()).kind, "not-connected")
    assert.equal(
      describeError(
        new VvdApiError("Provide an API key", 401, "NOT_AUTHENTICATED"),
      ).kind,
      "not-connected",
    )
  })

  it("routes a free-plan world to upgrade, not to forbidden", () => {
    const described = describeError(
      new VvdApiError("Needs Pro", 403, "UPGRADE_REQUIRED"),
    )
    assert.equal(described.kind, "upgrade")
    assert.equal(described.title, "This world needs Pro")
  })

  it("classifies by status when the envelope carries no code", () => {
    assert.equal(
      describeError(new VvdApiError("Rate limit exceeded", 429)).kind,
      "rate-limited",
    )
    assert.equal(describeError(new VvdApiError("nope", 403)).kind, "forbidden")
    assert.equal(describeError(new VvdApiError("gone", 404)).kind, "not-found")
    assert.equal(describeError(new VvdApiError("bad", 400)).kind, "invalid")
    assert.equal(describeError(new VvdApiError("boom", 500)).kind, "unknown")
  })

  it("names a network failure", () => {
    assert.equal(describeError(new TypeError("fetch failed")).kind, "offline")
    assert.equal(describeError("?").kind, "unknown")
    assert.equal(describeError(new Error("x")).message, "x")
  })
})
