import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  type PollOutcome,
  parseConnectStart,
  parsePollResponse,
  waitForApproval,
} from "./connect-flow.ts"

describe("parseConnectStart", () => {
  it("reads the start response and defaults the timings", () => {
    const started = parseConnectStart(
      { userCode: "ABCD-EFGH", deviceCode: "vvd_dev_x" },
      "https://vvd.world",
    )
    assert.equal(started.userCode, "ABCD-EFGH")
    assert.equal(started.verificationUrl, "https://vvd.world/connect")
    assert.equal(
      started.verificationUrlComplete,
      "https://vvd.world/connect?code=ABCD-EFGH",
    )
    assert.equal(started.expiresIn, 600)
    assert.equal(started.interval, 3)
  })

  it("builds the approval URL from the origin it called, never from the response", () => {
    // Behind Railway the server answered with its bind address once (0.0.0.0:8080).
    const started = parseConnectStart(
      {
        userCode: "ABCD-EFGH",
        deviceCode: "vvd_dev_x",
        verificationUrl: "http://0.0.0.0:8080/connect",
        verificationUrlComplete: "http://0.0.0.0:8080/connect?code=ABCD-EFGH",
      },
      "https://beta.vvd.world/",
    )
    assert.equal(started.verificationUrl, "https://beta.vvd.world/connect")
    assert.equal(
      started.verificationUrlComplete,
      "https://beta.vvd.world/connect?code=ABCD-EFGH",
    )
  })

  it("refuses a body without a code", () => {
    assert.throws(
      () => parseConnectStart({ userCode: "X" }, "https://vvd.world"),
      /didn't start/,
    )
    assert.throws(
      () => parseConnectStart(null, "https://vvd.world"),
      /didn't start/,
    )
  })
})

describe("parsePollResponse", () => {
  it("maps the device-flow vocabulary", () => {
    assert.deepEqual(
      parsePollResponse(202, { status: "authorization_pending" }),
      {
        status: "pending",
      },
    )
    assert.deepEqual(parsePollResponse(403, { status: "access_denied" }), {
      status: "denied",
    })
    assert.deepEqual(parsePollResponse(410, { status: "expired_token" }), {
      status: "expired",
    })
    assert.deepEqual(
      parsePollResponse(200, {
        status: "approved",
        access_token: "vvd_live_k",
        key_id: "id-1",
      }),
      { status: "approved", key: "vvd_live_k", keyId: "id-1" },
    )
  })

  it("treats an unexpected body as still pending", () => {
    assert.deepEqual(parsePollResponse(500, "<html>"), { status: "pending" })
  })
})

describe("waitForApproval", () => {
  const sleep = async () => {}

  it("keeps polling through pending and a thrown poll, then returns the key", async () => {
    const answers: Array<PollOutcome | Error> = [
      { status: "pending" },
      new Error("fetch failed"),
      { status: "approved", key: "vvd_live_k", keyId: null },
    ]
    let polls = 0
    const result = await waitForApproval(
      async () => {
        polls += 1
        const next = answers.shift()!
        if (next instanceof Error) throw next
        return next
      },
      { intervalMs: 1, deadlineMs: 10_000, sleep },
    )
    assert.deepEqual(result, {
      status: "approved",
      key: "vvd_live_k",
      keyId: null,
    })
    assert.equal(polls, 3)
  })

  it("stops on a denial", async () => {
    const result = await waitForApproval(async () => ({ status: "denied" }), {
      intervalMs: 1,
      deadlineMs: 10_000,
      sleep,
    })
    assert.deepEqual(result, { status: "denied" })
  })

  it("gives up at the deadline even if the server keeps saying pending", async () => {
    let t = 0
    const result = await waitForApproval(async () => ({ status: "pending" }), {
      intervalMs: 100,
      deadlineMs: 250,
      sleep: async (ms) => {
        t += ms
      },
      now: () => t,
    })
    assert.deepEqual(result, { status: "expired" })
  })

  it("honours an abort signal", async () => {
    const controller = new AbortController()
    let polls = 0
    const result = await waitForApproval(
      async () => {
        polls += 1
        controller.abort()
        return { status: "pending" }
      },
      { intervalMs: 1, deadlineMs: 10_000, sleep, signal: controller.signal },
    )
    assert.deepEqual(result, { status: "cancelled" })
    assert.equal(polls, 1)
  })
})
