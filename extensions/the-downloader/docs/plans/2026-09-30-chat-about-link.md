# Chat About Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Chat About Video into Chat About Link: videos, social posts and web pages, each loaded into one `LinkContext` the chat, the AI tools and the skills share.

**Architecture:** Three providers (`sources/video.ts`, `sources/post.ts`, `sources/page.ts`) map tool output (yt-dlp JSON, gallery-dl `-j` JSON, fetched HTML) to a `LinkContext` through pure mappers, behind a thin fetcher each. `link-loader.ts` validates the URL, routes with `detectSource`, and caches. The prompt logic (`link-chat.ts`) and the views work on `LinkContext` only; video-only features (timestamps, chapters, caption languages) read `ctx.body.type === "segments"` / `ctx.video`. Web pages are read through `safe-fetch.ts`, which refuses local and private addresses at every hop and pins the connection to the checked IP.

**Tech Stack:** TypeScript, Raycast API 2.5.3, React, vitest; yt-dlp, gallery-dl; new dependencies `@mozilla/readability` and `linkedom` (pure JS); Node `http`/`https`/`dns`/`net`/`zlib`.

**Spec:** `docs/specs/2026-09-30-chat-about-link-design.md` (with the 2026-09-30 additions: local-address blocking, charset decoding, URL validation).

## Global Constraints

- Work only on `claude/the-downloader-ai`; normal pushes; `git pull` before each push; no force-push, rebase or amend.
- Every commit message ends with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Before every push: `npm run build`, `npx tsc --noEmit`, `npx eslint src tests`, `npx prettier --check <changed files>`, `npx vitest run` — all pass.
- Node: prefix commands with `export PATH="$HOME/Projects/.node-22/node-v22.23.3-darwin-arm64/bin:$PATH"`.
- No change to the download pipeline, installer or updater.
- Every URL is validated (`isValidUrl`) and normalized (`normalizeUrl`) before it reaches yt-dlp, gallery-dl or fetch; gallery-dl gets `--` before the URL.
- The page reader refuses loopback, private, link-local, CGNAT, unspecified/multicast addresses and `localhost`, `*.localhost`, `*.local`, `*.internal`, `*.home.arpa` hosts, at every redirect hop, after DNS resolution, and connects only to the address it checked.
- Page text is decoded with the charset from the BOM, then the `Content-Type` header, then `<meta charset>` / `http-equiv`, then UTF-8.
- Page fetch: 15 s timeout, 5 MB cap, `text/html` or `application/xhtml+xml` only, at most 5 redirects.
- Chat keys: videos `<extractor>:<id>` (unchanged, old saved chats still match), posts `<category>:<id>`, pages the normalized URL without `#fragment`.
- Views are not unit-testable (vitest has only the `@raycast/api` stub); keep logic in pure `src/lib` modules with tests.
- `docs/` stays on the branch.

## Review Focus

1. A page that redirects (301/302/303/307/308) from a public host to `http://192.168.1.1/` or `http://router.local/` must be refused at the redirect, not followed — covered in Task 2.
2. A hostname whose DNS answer mixes a public and a private IP (rebinding) must be refused, and the socket must connect to the checked IP — covered in Task 2 (resolver injection + `lookup` pinning test).
3. A Czech page served as `windows-1250` with the charset only in `<meta http-equiv>` must read "Příliš žluťoučký kůň", not mojibake — covered in Task 3.
4. A one-paragraph article longer than the engine's budget must still be chunked (split at sentences), not silently dropped by `selectChunks` — covered in Task 5.
5. Apple's part notes on a long video must not run on until the 8,192-token window overflows; each note is capped and the summary still completes — covered in Task 1.

---

### Task 1: Cap part notes (Apple runaway output)

Only if the live run confirms a runaway note (a part taking minutes). Engine-agnostic: `answerFromNotes` aborts a part once its note passes `NOTE_CHAR_LIMIT` and keeps the text.

**Files:**

- Modify: `src/lib/video-chat.ts` (`answerFromNotes`)
- Test: `tests/video-chat.test.ts`

**Interfaces:**

- Produces: `NOTE_CHAR_LIMIT = 2_500` (exported for the test).

- [ ] **Step 1: Write the failing test**

```ts
it("caps a runaway part note and still writes the answer", async () => {
  const calls: string[] = [];
  const engine: Engine = {
    id: "apple",
    title: "Apple",
    contextBudget: 800,
    async complete(instructions, prompt, options = {}) {
      calls.push(instructions);
      if (!prompt.includes("## Notes on")) {
        let text = "";
        for (let i = 0; i < 1_000; i++) {
          if (options.signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
          text += "- [0:01] again and again\n";
          options.onData?.(text);
        }
        return text;
      }
      return "done";
    },
  };
  const answer = await answerFromNotes(engine, ctxWith(400), "Summarize the video");
  expect(answer).toBe("done");
  expect(calls.length).toBeGreaterThan(2);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/video-chat.test.ts` — expect FAIL (runs the full 1,000 lines or times out).
- [ ] **Step 3: Implement** — per part, a child `AbortController` linked to `options.signal`; `onData` aborts it when `text.length > NOTE_CHAR_LIMIT`; on an `AbortError` while the parent signal is not aborted, keep the captured text (cut to the limit).
- [ ] **Step 4: Run** the test — PASS.
- [ ] **Step 5: Commit** `the-downloader: cap each part note so a looping model can't overflow the window`

### Task 2: `safe-fetch.ts` — fetch that refuses local addresses

**Files:**

- Create: `src/lib/safe-fetch.ts`
- Test: `tests/safe-fetch.test.ts`

**Interfaces:**

- Produces:
  - `isBlockedHostname(host: string): boolean`
  - `isBlockedAddress(ip: string): boolean`
  - `type Resolver = (host: string) => Promise<{ address: string; family: 4 | 6 }[]>`
  - `type SafeFetchOptions = { signal?: AbortSignal; timeoutMs?: number; maxBytes?: number; maxRedirects?: number; accept?: string; resolve?: Resolver; allowAddress?: (ip: string) => boolean }`
  - `type SafeResponse = { url: string; status: number; contentType: string; body: Buffer }`
  - `safeFetch(url: string, options?: SafeFetchOptions): Promise<SafeResponse>`
  - `class BlockedAddressError extends Error`

- [ ] **Step 1: Write the failing tests**

```ts
describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "127.8.9.10",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "100.127.255.255",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:192.168.0.1",
    "64:ff9b::a00:1",
  ])("blocks %s", (ip) => expect(isBlockedAddress(ip)).toBe(true));
  it.each(["93.184.216.34", "1.1.1.1", "172.32.0.1", "100.128.0.1", "2606:4700::1111", "64:ff9b::5db8:d822"])(
    "allows %s",
    (ip) => expect(isBlockedAddress(ip)).toBe(false),
  );
});

describe("isBlockedHostname", () => {
  it.each([
    "localhost",
    "LOCALHOST",
    "foo.localhost",
    "router.local",
    "nas.internal",
    "printer.home.arpa",
    "localhost.",
  ])("blocks %s", (h) => expect(isBlockedHostname(h)).toBe(true));
  it.each(["example.com", "local.example.com", "internal.news"])("allows %s", (h) =>
    expect(isBlockedHostname(h)).toBe(false),
  );
});

describe("safeFetch", () => {
  // A local server stands in for the web; `allowAddress` lets the test reach 127.0.0.1 only.
  let server: http.Server;
  let port: number;
  const routes: Record<string, (res: http.ServerResponse) => void> = {};
  beforeAll(async () => {
    server = http.createServer((req, res) => (routes[req.url ?? ""] ?? ((r) => r.writeHead(404).end()))(res));
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => server.close());
  const onlyLoopback = {
    allowAddress: (ip: string) => ip === "127.0.0.1",
    resolve: async () => [{ address: "127.0.0.1", family: 4 as const }],
  };

  it("reads a page and follows a redirect it has checked", async () => {
    routes["/a"] = (res) => res.writeHead(302, { location: "/b" }).end();
    routes["/b"] = (res) => res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end("<p>hi</p>");
    const r = await safeFetch(`http://site.test:${port}/a`, onlyLoopback);
    expect(r.url).toBe(`http://site.test:${port}/b`);
    expect(r.body.toString()).toBe("<p>hi</p>");
  });

  it("refuses a redirect to a private address or a .local host", async () => {
    routes["/to-router"] = (res) => res.writeHead(301, { location: "http://192.168.1.1/admin" }).end();
    routes["/to-local"] = (res) => res.writeHead(307, { location: "http://router.local/" }).end();
    await expect(safeFetch(`http://site.test:${port}/to-router`, onlyLoopback)).rejects.toThrow(BlockedAddressError);
    await expect(safeFetch(`http://site.test:${port}/to-local`, onlyLoopback)).rejects.toThrow(BlockedAddressError);
  });

  it("refuses a name that resolves to any private address (DNS rebinding)", async () => {
    const resolve = async () => [
      { address: "93.184.216.34", family: 4 as const },
      { address: "10.0.0.5", family: 4 as const },
    ];
    await expect(safeFetch("http://rebind.test/", { resolve })).rejects.toThrow(BlockedAddressError);
  });

  it("refuses IP literals and localhost without resolving", async () => {
    await expect(safeFetch("http://127.0.0.1/")).rejects.toThrow(BlockedAddressError);
    await expect(safeFetch("http://[::1]/")).rejects.toThrow(BlockedAddressError);
    await expect(safeFetch("http://localhost:8080/")).rejects.toThrow(BlockedAddressError);
  });

  it("connects to the address it checked, not a second lookup", async () => {
    let lookups = 0;
    const resolve = async () => (lookups++, [{ address: "127.0.0.1", family: 4 as const }]);
    routes["/pin"] = (res) => res.writeHead(200, { "content-type": "text/html" }).end("ok");
    await safeFetch(`http://pinned.test:${port}/pin`, { ...onlyLoopback, resolve });
    expect(lookups).toBe(1);
  });

  it("stops at the size cap, on non-HTML, on too many redirects and on HTTP errors", async () => {
    routes["/big"] = (res) => res.writeHead(200, { "content-type": "text/html" }).end("x".repeat(2_000));
    routes["/pdf"] = (res) => res.writeHead(200, { "content-type": "application/pdf" }).end("%PDF");
    routes["/loop"] = (res) => res.writeHead(302, { location: "/loop" }).end();
    routes["/gone"] = (res) => res.writeHead(404).end();
    await expect(safeFetch(`http://s.test:${port}/big`, { ...onlyLoopback, maxBytes: 1_000 })).rejects.toThrow(
      /larger than/,
    );
    await expect(safeFetch(`http://s.test:${port}/pdf`, { ...onlyLoopback, accept: "text/html" })).rejects.toThrow(
      /isn't a web page/,
    );
    await expect(safeFetch(`http://s.test:${port}/loop`, onlyLoopback)).rejects.toThrow(/redirects/);
    await expect(safeFetch(`http://s.test:${port}/gone`, onlyLoopback)).rejects.toThrow(/404/);
  });

  it("decompresses gzip", async () => {
    routes["/gz"] = (res) =>
      res
        .writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" })
        .end(zlib.gzipSync("<p>zipped</p>"));
    expect((await safeFetch(`http://s.test:${port}/gz`, onlyLoopback)).body.toString()).toBe("<p>zipped</p>");
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/safe-fetch.test.ts` — FAIL (module missing).
- [ ] **Step 3: Implement** `safe-fetch.ts`:
  - `isBlockedHostname`: lower-case, strip one trailing dot; `localhost` or ends with `.localhost`, `.local`, `.internal`, `.home.arpa`.
  - `isBlockedAddress`: `net.BlockList` with IPv4 subnets `0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24, 192.168.0.0/16, 198.18.0.0/15, 224.0.0.0/4, 240.0.0.0/4` (covers 255.255.255.255) and IPv6 `::/128, ::1/128, fc00::/7, fe80::/10, ff00::/8`; `::ffff:a.b.c.d` and `64:ff9b::/96` are checked as their embedded IPv4 (convert the last 32 bits).
  - `safeFetch`: loop ≤ `maxRedirects` (5): parse URL (`http:`/`https:` only) → `isBlockedHostname` → IP literal (`net.isIP` on the bracket-stripped host) checked directly, else `resolve` (default `dns.promises.lookup(host, { all: true, verbatim: true })`) and refuse when any address is blocked or `allowAddress` rejects it → `http(s).request({ host, port, path, method: "GET", headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-encoding": "gzip, deflate, br", "accept-language": "en,*;q=0.5" }, lookup: pinned(address, family), signal })` where `pinned` answers `(host, opts, cb) => opts.all ? cb(null, [{ address, family }]) : cb(null, address, family)` → 3xx with `location`: resolve against the current URL and loop; 4xx/5xx: `Error("HTTP <status> from <host>")`; else check `content-type` against `accept` (`Error("This link isn't a web page (<type>).")`), stream the body through `zlib.createGunzip/Inflate/BrotliDecompress` per `content-encoding`, count decoded bytes, destroy at `maxBytes` (`Error("The page is larger than <n> MB.")`). Whole call under `timeoutMs` (15 s) via a timer that aborts (`Error("The page took too long to load.")`).
  - `BlockedAddressError` message: `Won't read <host>: it's a local or private network address.`
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `the-downloader: add a page fetcher that refuses local and private addresses`

### Task 3: Charset-aware HTML decoding

**Files:**

- Create: `src/lib/charset.ts`
- Create: `tests/fixtures/links/cz-article-1250.html` (windows-1250 bytes; `<meta http-equiv="Content-Type" content="text/html; charset=windows-1250">`, text "Příliš žluťoučký kůň úpěl ďábelské ódy.")
- Test: `tests/charset.test.ts`

**Interfaces:**

- Produces: `charsetOf(contentType: string | undefined, head: Buffer): string`; `decodeHtml(body: Buffer, contentType?: string): string`.

- [ ] **Step 1: Write the failing tests**

```ts
const czech = fs.readFileSync(path.join(__dirname, "fixtures/links/cz-article-1250.html"));
it("uses <meta http-equiv> when the header has no charset", () => {
  expect(decodeHtml(czech, "text/html")).toContain("Příliš žluťoučký kůň úpěl ďábelské ódy.");
});
it("prefers the header over the meta tag, and a BOM over both", () => {
  expect(charsetOf("text/html; charset=ISO-8859-2", Buffer.from('<meta charset="utf-8">'))).toBe("iso-8859-2");
  expect(charsetOf("text/html; charset=windows-1250", Buffer.from([0xef, 0xbb, 0xbf, 0x3c]))).toBe("utf-8");
});
it("reads <meta charset> and falls back to UTF-8 for unknown labels", () => {
  expect(charsetOf(undefined, Buffer.from('<head><meta charset="iso-8859-2">'))).toBe("iso-8859-2");
  expect(decodeHtml(Buffer.from("<p>čau</p>"), "text/html; charset=x-made-up")).toBe("<p>čau</p>");
});
it("decodes ISO-8859-2", () => {
  expect(decodeHtml(Buffer.from([0xb9, 0xe8]), "text/html; charset=iso-8859-2")).toBe("šč");
});
```

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**: BOM (`EF BB BF` → utf-8, `FF FE` → utf-16le, `FE FF` → utf-16be); header `charset=` param; prescan the first 4 KB as latin1 for `<meta charset=…>` or `<meta http-equiv=…content-type… content="…charset=…">`; lower-case; `new TextDecoder(label)` in a try, UTF-8 when the label is unknown.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `the-downloader: decode web pages with their declared charset`

### Task 4: `LinkContext` and the shared text helpers

Move the kind-neutral parts of `video-context.ts` into `link-context.ts`; video-only helpers move to `sources/video.ts` in Task 5.

**Files:**

- Create: `src/lib/link-context.ts`
- Modify/Delete: `src/lib/video-context.ts` (removed at the end of Task 5)
- Test: `tests/link-context.test.ts` (the generic tests from `tests/video-context.test.ts` move here)

**Interfaces:**

- Produces:

```ts
export type LinkKind = "video" | "post" | "page";
export type LinkFact = { label: string; value: string };
export type LinkBody =
  { type: "segments"; segments: TranscriptSegment[] } | { type: "paragraphs"; paragraphs: string[] };
export type LinkNoteReason = NoTranscriptReason | "blocked" | "unreadable";
export type LinkContext = {
  url: string;
  kind: LinkKind;
  /** Chat key: `<extractor>:<id>` for videos, `<category>:<id>` for posts, the URL for pages. */
  key: string;
  site: string;
  title: string;
  author?: string;
  authorVerified?: boolean;
  /** `YYYY-MM-DD`. */
  publishedAt?: string;
  thumbnail?: string;
  /** Kind-specific facts for the dossier, e.g. Duration, Spoken language. */
  facts: LinkFact[];
  stats: LinkFact[];
  description?: string;
  chapters?: Chapter[];
  tags?: string[];
  body: LinkBody;
  /** Caption language actually used (videos). */
  language?: string;
  images?: string[];
  note?: string;
  noteReason?: LinkNoteReason;
  /** Slim yt-dlp metadata, videos only (timestamps, formats, Media Preview). */
  video?: Video;
  fetchedAt: number;
};
export function hasBody(ctx: LinkContext): boolean;
export function bodyText(body: LinkBody): string; // `[m:ss] …` lines, or paragraphs joined by blank lines
export function dossierMarkdown(ctx: LinkContext, descriptionLimit?: number): string;
export type Chunk = { start: number; end: number; text: string };
export function chunkBody(body: LinkBody, targetTokens: number): Chunk[];
// unchanged, moved: estimateTokens, truncateToTokens, formatTimestamp, parseTimestamp,
// linkifyTimestamps, scoreChunks, selectChunks, isOverviewRequest
```

- [ ] **Step 1: Write the failing tests** (in addition to the moved ones)

```ts
const page = (paragraphs: string[]): LinkContext => ({
  url: "https://example.com/a",
  kind: "page",
  key: "https://example.com/a",
  site: "example.com",
  title: "An article",
  facts: [{ label: "Reading time", value: "3 min" }],
  stats: [],
  body: { type: "paragraphs", paragraphs },
  fetchedAt: 0,
});

it("renders a dossier from facts and stats for any kind", () => {
  const md = dossierMarkdown({
    ...page(["x"]),
    author: "Jana Nováková",
    publishedAt: "2026-09-01",
    stats: [{ label: "Likes", value: "1.2K" }],
  });
  expect(md).toContain("# An article");
  expect(md).toContain("- Author: Jana Nováková");
  expect(md).toContain("- Published: 2026-09-01");
  expect(md).toContain("- Reading time: 3 min");
  expect(md).toContain("## Statistics\n- Likes: 1.2K");
});

it("chunks paragraphs by position, without timestamps", () => {
  const chunks = chunkBody(
    { type: "paragraphs", paragraphs: ["a ".repeat(300), "b ".repeat(300), "c ".repeat(300)] },
    200,
  );
  expect(chunks.map((c) => c.start)).toEqual([0, 1, 2]);
  expect(chunks[0].text).not.toMatch(/\[\d+:\d{2}\]/);
});

it("splits one very long paragraph at sentences so it still fits a budget", () => {
  const long = Array.from({ length: 200 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
  const chunks = chunkBody({ type: "paragraphs", paragraphs: [long] }, 150);
  expect(chunks.length).toBeGreaterThan(3);
  expect(Math.max(...chunks.map((c) => estimateTokens(c.text)))).toBeLessThanOrEqual(200);
});

it("keeps timestamped lines for segments", () => {
  expect(bodyText({ type: "segments", segments: [{ start: 65, text: "hi" }] })).toBe("[1:05] hi");
});
```

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**: `bodyUnits(body)` → `{ pos, text }[]` (segments: `pos = start`, text `[m:ss] …`; paragraphs: `pos = index`, a paragraph over `targetTokens` split into sentence groups under it, all with the paragraph's index); `chunkBody` groups units like today's `chunkSegments`; `dossierMarkdown`: `# title`, `## Facts` (Author (+ " (verified)"), URL, Site, Published, then `ctx.facts`), `## Statistics` (`ctx.stats`), `## Chapters` (videos), `## Tags` (≤ 30), `## Description` (cut at `descriptionLimit`, default 2,000).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `the-downloader: add LinkContext and kind-neutral text helpers`

### Task 5: Video provider

**Files:**

- Create: `src/lib/sources/video.ts`
- Create: `tests/fixtures/links/youtube-video.json` (a real `yt-dlp -J` of arj7oStGLkU, slimmed with `slimVideo`)
- Delete: `src/lib/video-context.ts`
- Test: `tests/sources-video.test.ts` (video-specific tests from `tests/video-context.test.ts` move here)

**Interfaces:**

- Consumes: `LinkContext` (Task 4), `fetchTranscriptSegments`, `NoTranscriptError` (`src/transcript.ts`).
- Produces: `videoToLink(url: string, video: Video, transcript: { segments: TranscriptSegment[]; language?: string } | { note: string; reason: NoTranscriptReason }, now?: number): LinkContext`; `loadVideoLink(url: string, options: { signal?: AbortSignal; language?: string }): Promise<LinkContext>`; moved: `videoStats`, `timestampUrl(ctx: Pick<LinkContext, "url" | "video">, s)`, `captionLanguages`, `slimVideo`.

- [ ] **Step 1: Failing tests**

```ts
const video = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/links/youtube-video.json"), "utf8"));
it("keeps the old chat key so saved chats still match", () => {
  const ctx = videoToLink("https://youtu.be/arj7oStGLkU", video, {
    segments: [{ start: 0, text: "hi" }],
    language: "en",
  });
  expect(ctx.key).toBe("youtube:arj7oStGLkU");
  expect(ctx.kind).toBe("video");
  expect(ctx.facts.map((f) => f.label)).toEqual(expect.arrayContaining(["Duration", "Transcript language"]));
  expect(ctx.stats.map((f) => f.label)).toEqual(expect.arrayContaining(["Views", "Likes", "Views per day"]));
});
it("keeps the video usable without captions, with the reason", () => {
  const ctx = videoToLink("u", video, { note: "This video has no captions.", reason: "none" });
  expect(ctx.body).toEqual({ type: "segments", segments: [] });
  expect(ctx).toMatchObject({ note: "This video has no captions.", noteReason: "none" });
});
```

- [ ] **Step 2–4:** implement the mapper from today's `dossierMarkdown`/`statsLines` fields (Channel → `author`, `extractor_key` → `site`, `upload_date` → `publishedAt`), move the helpers, update imports; run — PASS.
- [ ] **Step 5: Commit** `the-downloader: map videos to LinkContext`

### Task 6: Post provider (gallery-dl)

**Files:**

- Create: `src/lib/sources/post.ts`
- Create: `tests/fixtures/links/instagram-posts.json` (real `gallery-dl -j --range 1 https://www.instagram.com/nasa/posts/`), `tests/fixtures/links/reddit-blocked.json`, `tests/fixtures/links/instagram-login.json` (real error records)
- Test: `tests/sources-post.test.ts`

**Interfaces:**

- Produces: `class LinkLoadError extends Error { fix?: "preferences" }`; `parseGalleryJson(json: unknown, url: string): LinkContext` (throws `LinkLoadError`); `buildPostArgs(url: string, cookiesFromBrowser?: string): string[]`; `loadPostLink(url, { signal?, cookiesFromBrowser? }): Promise<LinkContext>`.

- [ ] **Step 1: Failing tests**

```ts
it("reads caption, author, date, likes and images from Instagram", () => {
  const ctx = parseGalleryJson(fixture("instagram-posts.json"), "https://www.instagram.com/p/X/");
  expect(ctx).toMatchObject({ kind: "post", site: "Instagram", author: expect.stringContaining("nasa") });
  expect(ctx.key).toMatch(/^instagram:/);
  expect(ctx.body.type).toBe("paragraphs");
  expect(ctx.images?.length).toBeGreaterThan(0);
  expect(ctx.stats.find((s) => s.label === "Likes")).toBeDefined();
});
it("turns Reddit's block and Instagram's login redirect into a fix", () => {
  expect(() => parseGalleryJson(fixture("reddit-blocked.json"), "https://www.reddit.com/r/x/comments/1/")).toThrow(
    expect.objectContaining({ message: expect.stringMatching(/Reddit blocks anonymous access/), fix: "preferences" }),
  );
  expect(() => parseGalleryJson(fixture("instagram-login.json"), "https://www.instagram.com/p/X/")).toThrow(
    expect.objectContaining({ fix: "preferences" }),
  );
});
it("never lets a URL become an option", () => {
  expect(buildPostArgs("https://www.instagram.com/p/X/")).toEqual([
    "-j",
    "--range",
    "1-20",
    "--",
    "https://www.instagram.com/p/X/",
  ]);
  expect(buildPostArgs("https://x.com/p", "firefox")).toEqual([
    "-j",
    "--range",
    "1-20",
    "--cookies-from-browser",
    "firefox",
    "--",
    "https://x.com/p",
  ]);
});
```

- [ ] **Step 2–4:** implement: directory records (`[2, meta]`) give the post, file records (`[3, url, meta]`) the images (skip `video_url` entries); caption from `description ?? selftext ?? content ?? title`; hashtags from `#\p{L}+` in the caption; author from `fullname`/`username`, coauthors from `coauthors[].username`; `date` → `publishedAt`; Likes (`likes`/`score`), Comments (`num_comments`/`comment_count`), Images (`count`); key `<category>:<post_shortcode ?? id ?? post_id>`; error records `[-1, { message }]` → `LinkLoadError` (login/blocked text → per-site message + `fix: "preferences"`; anything else plain). `loadPostLink` runs `gallery-dl` via `runWithWatchdog` (60 s idle), cookies from `resolveBrowser(prefs.cookiesFromBrowser, prefs.cookiesFromBrowserCustom)`. Run — PASS.
- [ ] **Step 5: Commit** `the-downloader: read social posts with gallery-dl metadata`

### Task 7: Page provider (Readability)

**Files:**

- Modify: `package.json` / `package-lock.json` (`npm install @mozilla/readability linkedom`)
- Create: `src/lib/sources/page.ts`
- Create: fixtures `tests/fixtures/links/article.html` (real news article), `paywall.html`, `js-only.html` (real SPA shell), plus Task 3's Czech file
- Test: `tests/sources-page.test.ts`

**Interfaces:**

- Consumes: `safeFetch` (Task 2), `decodeHtml` (Task 3).
- Produces: `parsePage(html: string, url: string, now?: number): LinkContext`; `loadPageLink(url, { signal? }): Promise<LinkContext>`.

- [ ] **Step 1: Failing tests**

```ts
it("reads title, site, author, date and paragraphs from an article", () => {
  const ctx = parsePage(read("article.html"), ARTICLE_URL);
  expect(ctx).toMatchObject({ kind: "page", key: ARTICLE_URL, title: expect.any(String), site: expect.any(String) });
  expect(ctx.body.type === "paragraphs" && ctx.body.paragraphs.length).toBeGreaterThan(3);
  expect(ctx.facts.find((f) => f.label === "Reading time")?.value).toMatch(/min/);
});
it("says why when there's almost no text (JS-only or paywall)", () => {
  for (const name of ["js-only.html", "paywall.html"]) {
    const ctx = parsePage(read(name), "https://example.com/x");
    expect(ctx.note).toBe("Couldn't read this page's text (it may need a login or JavaScript).");
    expect(ctx.noteReason).toBe("unreadable");
  }
});
it("reads a windows-1250 Czech article end to end", () => {
  const ctx = parsePage(decodeHtml(czechBytes, "text/html"), "https://example.cz/clanek");
  expect(bodyText(ctx.body)).toContain("Příliš žluťoučký kůň");
});
it("drops the #fragment from the chat key", () => {
  expect(parsePage(read("article.html"), `${ARTICLE_URL}#comments`).key).toBe(ARTICLE_URL);
});
```

- [ ] **Step 2–4:** implement with `parseHTML` (linkedom) + `new Readability(document).parse()`; metadata from `og:title`, `og:site_name`, `og:description`, `og:image`, `article:published_time`, `meta[name=author]`, JSON-LD `headline`/`author.name`/`datePublished`, `<title>`; paragraphs from block elements of `article.content` that contain no other block; under 200 characters → note; words ÷ 200 → Reading time; `loadPageLink`: `safeFetch(url, { accept: "text/html", maxBytes: 5 MB, timeoutMs: 15 s })` → `decodeHtml` → `parsePage(html, response.url)`. Run — PASS.
- [ ] **Step 5: Commit** `the-downloader: read web pages with Readability`

### Task 8: `loadLinkContext` — validation, routing, cache

**Files:**

- Create: `src/lib/link-loader.ts` (replaces `src/lib/context-cache.ts`)
- Test: `tests/link-loader.test.ts` (from `tests/context-cache.test.ts`)

**Interfaces:**

- Produces: `loadLinkContext(url: string, options?: { signal?: AbortSignal; language?: string; force?: boolean }): Promise<LinkContext>`; `linkKindOf(url: string): LinkKind | "spotify"`.

- [ ] **Step 1: Failing tests** (providers mocked with `vi.mock`)

```ts
it("refuses anything that isn't an http(s) link before any tool runs", async () => {
  await expect(loadLinkContext("--batch-file=/etc/hosts")).rejects.toThrow(/Invalid URL/);
  expect(loadPostLink).not.toHaveBeenCalled();
});
it("routes by site and normalizes the URL", async () => {
  await loadLinkContext("instagram.com/p/X/");
  expect(loadPostLink).toHaveBeenCalledWith("https://instagram.com/p/X/", expect.anything());
  await loadLinkContext("https://www.youtube.com/watch?v=a");
  expect(loadVideoLink).toHaveBeenCalled();
  await loadLinkContext("https://example.com/news");
  expect(loadPageLink).toHaveBeenCalled();
});
it("says Spotify isn't supported yet", async () => {
  await expect(loadLinkContext("https://open.spotify.com/track/1")).rejects.toThrow(
    "Spotify links aren't supported in chat yet.",
  );
});
it("caches by kind, language and URL, and skips the cache without a body", async () => {
  /* as today's context-cache test */
});
```

- [ ] **Step 2–4:** implement; cache namespace `link-context`, key `${kind}|${language}|${url}`, TTL 6 h. Run — PASS.
- [ ] **Step 5: Commit** `the-downloader: load any link into a LinkContext`

### Task 9: Prompts per kind

**Files:**

- Rename: `src/lib/video-chat.ts` → `src/lib/link-chat.ts`
- Test: `tests/link-chat.test.ts` (from `tests/video-chat.test.ts`)

**Interfaces:**

- Produces: `chatInstructions(kind: LinkKind): string`; `buildPrompt(ctx: LinkContext, question, history, budgetTokens)`; `answerQuestion`, `answerFromNotes` (with Task 1's cap); `contextForExport(ctx)`; `linkInfoForAI(ctx)`; `linkTextForAI(ctx)`; `bodyForSave(ctx): { name: string; ext: "txt"; content: string }`; `conversationMarkdown(ctx, turns, engineTitle?)`.

- [ ] **Step 1: Failing tests**

```ts
it("asks for timestamps only for videos", () => {
  expect(chatInstructions("video")).toMatch(/\[4:05\]/);
  expect(chatInstructions("page")).not.toMatch(/timestamp/i);
  expect(chatInstructions("post")).toMatch(/caption/);
});
it("labels the body per kind", () => {
  expect(buildPrompt(pageCtx, "q", [], 5_000).prompt).toContain("## Article text");
  expect(buildPrompt(postCtx, "q", [], 5_000).prompt).toContain("## Caption");
  expect(buildPrompt(videoCtx, "q", [], 5_000).prompt).toContain("## Transcript");
});
it("treats 'what is this article about' as an overview", () => {
  expect(isOverviewRequest("What is this article about?")).toBe(true);
});
it("tells the AI tools which kind of link it is", () => {
  expect(linkInfoForAI(pageCtx)).toContain("Use the read-link tool");
  expect(linkTextForAI(videoCtx)).toContain("Link to a moment");
  expect(linkTextForAI(pageCtx)).not.toContain("Link to a moment");
});
```

- [ ] **Step 2–4:** implement; run — PASS.
- [ ] **Step 5: Commit** `the-downloader: prompts and exports for videos, posts and pages`

### Task 10: Images — engines and the decision

**Files:**

- Modify: `src/lib/ai-engines.ts` (`CompleteOptions.images?: string[]`, `Engine.seesImages(): Promise<boolean>`, Apple `--image … --text`, Ollama `/api/show` + `images` base64)
- Create: `src/lib/link-images.ts`
- Modify: `package.json` (preference `chatImages`: Ask Each Time (`ask`, default) / Always (`always`) / Never (`never`), title "Chat: Look at Images")
- Test: `tests/ai-engines.test.ts`, `tests/link-images.test.ts`

**Interfaces:**

- Produces: `imageDecision(pref: "ask" | "always" | "never", seesImages: boolean, count: number): "ask" | "use" | "skip"`; `fetchImages(urls: string[], dir: string, options?: { signal?: AbortSignal; max?: number }): Promise<string[]>` (via `safeFetch`, `image/*`, 10 MB each, `max` 4); `APPLE_IMAGE_TOKENS` (measured, reserved from the budget per image).

- [ ] **Step 1: Failing tests**

```ts
it.each([
  ["ask", true, 3, "ask"],
  ["always", true, 3, "use"],
  ["never", true, 3, "skip"],
  ["ask", false, 3, "skip"],
  ["always", true, 0, "skip"],
] as const)("%s × sees=%s × %d images → %s", (pref, sees, n, out) => expect(imageDecision(pref, sees, n)).toBe(out));

it("passes images to fm with --image and the prompt as --text", () => {
  expect(buildFmArgs("i", "p", ["/t/a.jpg"])).toEqual([
    "respond",
    "--instructions",
    "i",
    "--stream",
    "--image",
    "/t/a.jpg",
    "--text",
    "p",
  ]);
});
it("sees images only when Ollama lists vision", async () => {
  /* /api/show mocked: capabilities ["completion","vision"] → true; ["completion"] → false */
});
```

- [ ] **Step 2–4:** implement; measure `APPLE_IMAGE_TOKENS` with `fm respond --image` + text of known size near the window edge; run — PASS.
- [ ] **Step 5: Commit** `the-downloader: let vision engines look at a post's images`

### Task 11: Chat store keys and kinds

**Files:**

- Modify: `src/lib/chat-store.ts` (`chatKey(ctx) = ctx.key`; `StoredChat.kind?: LinkKind`, missing → `video`)
- Test: `tests/chat-store.test.ts`

- [ ] **Step 1: Failing test** — an old stored chat without `kind` parses and is treated as a video; `chatKey` of a mapped YouTube video equals the pre-change key `youtube:<id>`.
- [ ] **Step 2–4:** implement; run — PASS.
- [ ] **Step 5: Commit** `the-downloader: store chats about any link`

### Task 12: Views and the command

**Files:**

- Rename: `src/views/video-chat.tsx` → `src/views/link-chat.tsx` (`LinkChat`, `CHAT_SHORTCUT`)
- Rename: `src/chat-video.tsx` → `src/chat-link.tsx`
- Modify: `src/views/chat-home.tsx`, `src/views/download-form.tsx`, `src/views/media-preview.tsx`, `src/views/download-view.tsx`, `src/views/history-view.tsx`, `package.json` (command `chat-link`, title "Chat About Link", keywords video, post, article, youtube, instagram, tiktok, summarize, transcript; argument placeholder "Link")

- [ ] **Step 1:** `LinkChat`: loads with `loadLinkContext`; `LinkLoadError.fix === "preferences"` adds **Open Extension Preferences** to the error item/empty view (next to Try Again, Copy Error, Open Link); About This Video/Post/Page per spec §3 (post: author(s), date, likes, comments, hashtags, image count, first image; page: site, author, date, reading time); suggestions per kind (videos keep today's list; posts: What is this post about? · Translate the caption · Explain the hashtags; pages: Summarize this article · What are the key takeaways? · What's the author's argument?); actions: Copy Context for Any AI, Save Text (Save Transcript with Timestamps for videos), Open Link, Reload, Clear Chat, Download Video / Download Images / Save Page (launches `index` with the URL); timestamp links only for videos; image decision: `ask` → `confirmAlert("Let the AI look at this post's N images? It's slower.", Allow / Text Only)` on the first question, remembered in state; text-only engine → About notes "N images (this engine reads text only)".
- [ ] **Step 2:** `ChatHome`: "Paste a link to start" (videos, posts, articles), Recent Chats icon per `kind` (Video / Image / Document when no thumbnail).
- [ ] **Step 3:** entry points use `LinkChat` for any link.
- [ ] **Step 4:** `npm run build` + full checks.
- [ ] **Step 5: Commit** `the-downloader: Chat About Link — chat about videos, posts and pages`

### Task 13: Raycast AI tools, skills, evals

**Files:**

- Create: `src/tools/get-link-info.ts`, `src/tools/read-link.ts`; Delete: `src/tools/get-video-info.ts`, `src/tools/extract-transcript.ts`
- Rename skills: `skills/summarize-link`, `skills/study-notes`, `skills/performance-check` (updated text)
- Modify: `package.json` `tools`, `ai.instructions`, `ai.skills`, `ai.evals` (new names; one Instagram post eval, one article eval)
- Test: `tests/ai-tools.test.ts`

- [ ] **Step 1: Failing tests** — both tools reject `--batch-file=/etc/hosts` with "Invalid URL" before loading; `read-link` on a page returns the article text without "Link to a moment"; `get-link-info` has no body.
- [ ] **Step 2–4:** implement; run — PASS; `npm run build` validates the manifest.
- [ ] **Step 5: Commit** `the-downloader: get-link-info and read-link tools, skills for any link`

### Task 14: Live checks, guided pass, evals, screenshots, report

- [ ] Temporary live headless checks (not committed): YouTube, TikTok or X, Instagram, Reddit (blocked, then with cookies), news article, JS-only page, Czech article — with Ollama and Apple.
- [ ] Guided UI pass with the user (numbered steps), light and dark.
- [ ] `@the-downloader` in AI Chat with each tool and skill; `npx ray evals` (the user runs `npx ray login` if needed); fix failing descriptions.
- [ ] 2–4 Window Capture screenshots (2000×1250, one theme) in `~/Desktop/the-downloader-ai-screens`.
- [ ] Report: check table, commit hashes, what's still broken or unverified.
