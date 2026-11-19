import { describe, expect, test } from "bun:test"
import { apiToken, ConfigError, HOSTED, instanceUrl } from "../src/lib/config"

describe("instanceUrl", () => {
  test("defaults to the hosted app", () => {
    expect(instanceUrl(undefined)).toBe(HOSTED)
    expect(instanceUrl("   ")).toBe(HOSTED)
  })

  test("adds https:// to a bare host", () => {
    expect(instanceUrl("paste.example.com")).toBe("https://paste.example.com")
    expect(instanceUrl("paste.example.com:8443")).toBe("https://paste.example.com:8443")
  })

  test("drops a path, query and trailing slash", () => {
    expect(instanceUrl("https://paste.example.com/dashboard?tab=1#top")).toBe(
      "https://paste.example.com",
    )
    expect(instanceUrl("https://app.sniptide.com/")).toBe(HOSTED)
  })

  test("allows http:// only for a local instance", () => {
    expect(instanceUrl("http://localhost:3000")).toBe("http://localhost:3000")
    expect(instanceUrl("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000")
    expect(() => instanceUrl("http://paste.example.com")).toThrow(ConfigError)
  })

  test("refuses other schemes, credentials and text that is no address", () => {
    expect(() => instanceUrl("ftp://paste.example.com")).toThrow(ConfigError)
    expect(() => instanceUrl("https://user:secret@paste.example.com")).toThrow(ConfigError)
    expect(() => instanceUrl("not an address")).toThrow(ConfigError)
  })
})

describe("apiToken", () => {
  test("trims the whitespace a copy adds", () => {
    expect(apiToken("  snpt_abc\n")).toBe("snpt_abc")
  })

  test("refuses an empty or broken token", () => {
    expect(() => apiToken(undefined)).toThrow(ConfigError)
    expect(() => apiToken("   ")).toThrow(ConfigError)
    expect(() => apiToken("snpt_a bc")).toThrow(ConfigError)
  })
})
