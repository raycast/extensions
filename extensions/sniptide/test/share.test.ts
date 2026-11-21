import { describe, expect, test } from "bun:test"
import { type CaptureInput, type Paste, SniptideClient } from "@sniptide/sdk"
import { NothingToShareError, type ShareSteps, share } from "../src/lib/share"

function paste(input: CaptureInput): Paste {
  return {
    id: "p1",
    slug: "abc123",
    url: "https://app.sniptide.com/p/abc123",
    title: input.title,
    description: "",
    visibility: input.visibility ?? "private",
    collection: null,
    tags: [],
    source: null,
    files: input.files.map((file) => ({ ...file, language: "plaintext" })),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: null,
  }
}

function steps(text: string | undefined, overrides: Partial<ShareSteps> = {}) {
  const created: Array<{ input: CaptureInput; key?: string }> = []
  const copied: string[] = []
  const value: ShareSteps = {
    read: async () => text,
    empty: "Nothing to share.",
    client: {
      async createPaste(input, key) {
        created.push({ input, key })
        return { paste: paste(input) }
      },
    },
    options: { visibility: "unlisted" },
    copy: async (link) => {
      copied.push(link)
    },
    key: () => "key-1",
    ...overrides,
  }
  return { value, created, copied }
}

describe("share", () => {
  test("creates a paste from the text and copies its link", async () => {
    const { value, created, copied } = steps('{"ok": true}')
    const result = await share(value)
    expect(created).toEqual([
      {
        input: {
          title: '{"ok": true}',
          visibility: "unlisted",
          files: [{ name: "snippet.json", content: '{"ok": true}' }],
        },
        key: "key-1",
      },
    ])
    expect(copied).toEqual(["https://app.sniptide.com/p/abc123"])
    expect(result.slug).toBe("abc123")
  })

  test("creates nothing when there is no text", async () => {
    for (const text of [undefined, "", " \n "]) {
      const { value, created, copied } = steps(text)
      await expect(share(value)).rejects.toThrow(new NothingToShareError("Nothing to share."))
      expect(created).toEqual([])
      expect(copied).toEqual([])
    }
  })

  test("copies nothing when Sniptide refuses the paste", async () => {
    const { value, copied } = steps("text", {
      client: {
        async createPaste() {
          throw new Error("refused")
        },
      },
    })
    await expect(share(value)).rejects.toThrow("refused")
    expect(copied).toEqual([])
  })

  test("sends the request the API expects through the SDK", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = []
    const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} })
      const input = JSON.parse(String(init?.body)) as CaptureInput
      return Response.json({ paste: paste(input) })
    }) as typeof fetch
    const { value, copied } = steps("echo hi", {
      client: new SniptideClient("snpt_test", "https://paste.example.com", fetcher),
      options: { visibility: "private" },
    })
    await share(value)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe("https://paste.example.com/api/v1/pastes")
    expect(requests[0]?.init.method).toBe("POST")
    const headers = requests[0]?.init.headers as Record<string, string>
    expect(headers.authorization).toBe("Bearer snpt_test")
    expect(headers["idempotency-key"]).toBe("key-1")
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual({
      title: "echo hi",
      visibility: "private",
      files: [{ name: "snippet.txt", content: "echo hi" }],
    })
    expect(copied).toEqual(["https://app.sniptide.com/p/abc123"])
  })
})
