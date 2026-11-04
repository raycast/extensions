import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import { GrokFile, GrokFiles, savedName } from "../src/lib/files.ts"
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

const runFiles = <A, E>(
  fetch: FakeFetch,
  use: (files: GrokFiles["Service"]) => Effect.Effect<A, E>,
) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(GrokFiles.use(use)),
      Effect.provide(GrokFiles.layer.pipe(Layer.provideMerge(testLayer(fetch, signedIn())))),
    ),
  )

const wireFile = (id: string, extra: Readonly<Record<string, string | number>> = {}) => ({
  id,
  object: "file",
  filename: `${id}.txt`,
  bytes: 12,
  created_at: 1_700_000_000,
  ...extra,
})

const file = new GrokFile({
  id: "file-1",
  filename: "notes.txt",
  bytes: 5,
  createdAt: 0,
  expiresAt: Option.none(),
  purpose: Option.none(),
  publicLink: Option.none(),
})

describe("GrokFiles.list", () => {
  it("lists the newest files first, as the signed-in user, with expiries and public links", async () => {
    const fetch = fakeFetch(() =>
      Response.json({
        data: [
          wireFile("file-1", {
            expires_at: 1_800_000_000,
            purpose: "assistants",
            public_url: "https://files.x.ai/p/abc",
            public_url_expires_at: 1_750_000_000,
          }),
          wireFile("file-2", { purpose: "", public_url: "" }),
        ],
      }),
    )
    const list = await runFiles(fetch, (files) => files.list)
    assert.equal(list.more, false)
    assert.deepEqual(
      list.files.map((each) => each.id),
      ["file-1", "file-2"],
    )
    const [first, second] = list.files
    assert.ok(first && second)
    assert.equal(first.createdAt, 1_700_000_000_000)
    assert.deepEqual(first.expiresAt, Option.some(1_800_000_000_000))
    assert.deepEqual(first.purpose, Option.some("assistants"))
    assert.deepEqual(
      Option.map(first.publicLink, (link) => [link.url, link.expiresAt]),
      Option.some(["https://files.x.ai/p/abc", Option.some(1_750_000_000_000)]),
    )
    assert.ok(Option.isNone(second.purpose))
    assert.ok(Option.isNone(second.publicLink))
    const request = fetch.requests[0]
    assert.ok(request)
    const url = new URL(request.url)
    assert.equal(url.searchParams.get("sort_by"), "created_at")
    assert.equal(url.searchParams.get("order"), "desc")
    assert.equal(request.headers.get("authorization"), "Bearer a1")
  })

  it("follows the pagination token, and stops after five pages", async () => {
    const fetch = fakeFetch((_, index) =>
      Response.json({ data: [wireFile(`file-${index}`)], pagination_token: `page-${index + 1}` }),
    )
    const list = await runFiles(fetch, (files) => files.list)
    assert.equal(fetch.requests.length, 5)
    assert.equal(list.files.length, 5)
    assert.equal(list.more, true)
    assert.equal(
      new URL(fetch.requests[1]?.url ?? "").searchParams.get("pagination_token"),
      "page-1",
    )
  })

  it("explains a 403 as the plan", async () => {
    const error = await runFiles(
      fakeFetch(() => json({ error: "forbidden" }, 403)),
      (files) => Effect.flip(files.list),
    )
    assert.equal(error._tag, "FilesError")
    assert.equal(error.reason, "plan")
  })
})

describe("GrokFiles changes", () => {
  it("uploads the bytes with the file name and expiry", async () => {
    const fetch = fakeFetch(() => Response.json(wireFile("file-9", { filename: "a.txt" })))
    const uploaded = await runFiles(fetch, (files) =>
      files.upload({
        filename: "a.txt",
        bytes: new Uint8Array([104, 105]),
        expiresAfter: Option.some(3600),
      }),
    )
    assert.equal(uploaded.id, "file-9")
    const request = fetch.requests[0]
    assert.ok(request)
    assert.equal(request.method, "POST")
    const form = await new Response(request.body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData()
    assert.equal(form.get("expires_after"), "3600")
    const part = form.get("file")
    assert.ok(part instanceof File)
    assert.equal(part.name, "a.txt")
    assert.equal(await part.text(), "hi")
  })

  it("downloads a file's bytes", async () => {
    const fetch = fakeFetch(() => new Response(new Uint8Array([1, 2, 3])))
    const downloaded = await runFiles(fetch, (files) => files.download(file))
    assert.deepEqual([...downloaded.bytes], [1, 2, 3])
    assert.equal(downloaded.filename, "notes.txt")
    assert.ok(fetch.requests[0]?.url.endsWith("/files/file-1/content"))
  })

  it("makes a public link with an expiry, and revokes it", async () => {
    const fetch = fakeFetch((request) =>
      request.url.endsWith("/revoke")
        ? Response.json({ id: "file-1", revoked: true })
        : Response.json({ public_url: "https://files.x.ai/p/xyz", expires_at: 1_800_000_000 }),
    )
    const link = await runFiles(fetch, (files) => files.share("file-1", Option.some(86_400)))
    assert.equal(link.url, "https://files.x.ai/p/xyz")
    assert.deepEqual(link.expiresAt, Option.some(1_800_000_000_000))
    assert.deepEqual(decodeJson(fetch.requests[0]?.body ?? ""), { expires_after: 86_400 })
    await runFiles(fetch, (files) => files.unshare("file-1"))
    assert.ok(fetch.requests[1]?.url.endsWith("/files/file-1/public-url/revoke"))
  })

  it("deletes a file", async () => {
    const fetch = fakeFetch(() => Response.json({ id: "file-1", object: "file", deleted: true }))
    await runFiles(fetch, (files) => files.remove("file-1"))
    assert.equal(fetch.requests[0]?.method, "DELETE")
  })
})

describe("savedName", () => {
  it("keeps the name, then numbers it before the extension", () => {
    assert.equal(savedName("report.pdf", 0), "report.pdf")
    assert.equal(savedName("report.pdf", 2), "report (2).pdf")
    assert.equal(savedName("archive", 1), "archive (1)")
    assert.equal(savedName(".env", 1), ".env (1)")
  })

  it("keeps only the last part of a name with folders", () => {
    assert.equal(savedName("../../etc/passwd", 0), "passwd")
    assert.equal(savedName("..", 0), "file")
  })
})
