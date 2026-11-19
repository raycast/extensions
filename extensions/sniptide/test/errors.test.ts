import { describe, expect, test } from "bun:test"
import { SniptideError } from "@sniptide/sdk"
import { ConfigError } from "../src/lib/config"
import { describe as explain } from "../src/lib/errors"
import { messages } from "../src/lib/messages"

describe("describe", () => {
  test("sends a rejected or read-only token to the preferences", () => {
    expect(explain(new SniptideError("Unauthorized", 401, "unauthorized"))).toEqual({
      message: messages.tokenRejected,
      preferences: true,
    })
    expect(explain(new SniptideError("Forbidden", 403, "forbidden"))).toEqual({
      message: messages.readOnly,
      preferences: true,
    })
  })

  test("names a connection problem, a redirect and a response that isn't Sniptide's", () => {
    for (const code of ["network_error", "redirect", "invalid_response"]) {
      expect(
        explain(new SniptideError("x", code === "network_error" ? undefined : 200, code)),
      ).toEqual({ message: messages.unreachable, preferences: true })
    }
  })

  test("asks the reader to wait when the token is rate limited", () => {
    expect(explain(new SniptideError("Too many", 429, "rate_limited"))).toEqual({
      message: messages.rateLimited,
      preferences: false,
    })
  })

  test("passes on Sniptide's own sentence for other failures", () => {
    expect(explain(new SniptideError("No paste with that id.", 404, "not_found"))).toEqual({
      message: "No paste with that id.",
      preferences: false,
    })
  })

  test("shows a setting the reader has to correct", () => {
    expect(explain(new ConfigError(messages.invalidInstance))).toEqual({
      message: messages.invalidInstance,
      preferences: true,
    })
    expect(explain(new TypeError("A valid token is required."))).toEqual({
      message: messages.invalidToken,
      preferences: true,
    })
  })

  test("keeps anything else generic", () => {
    expect(explain(new Error("boom"))).toEqual({
      message: messages.unexpected,
      preferences: false,
    })
    expect(explain("boom").message).toBe(messages.unexpected)
  })
})
