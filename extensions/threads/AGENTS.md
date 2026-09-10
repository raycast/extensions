# AGENTS.md

Guidance for coding agents working in this repository.

Paths here are repo-relative on purpose: this file ships into `raycast/extensions`, so an
absolute path would publish a machine path and stop resolving the moment it lands there.

## What this is

A Raycast extension for Threads. Most commands are thin `no-view` wrappers that build a
threads.com URL and `open` it — there is no Threads API client here and no authentication.
The one command that does real work is **Download Threads Media**.

macOS and Windows per the manifest. Requires the Raycast app and `ray` on PATH.

## Scripts

| Script                              | Does                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm install`                       | install dependencies                                                                        |
| `npm run dev`                       | `ray develop` — long-lived watcher; run it in a real terminal, never background-and-kill it |
| `npm run build`                     | `ray build -e dist` (also generates `raycast-env.d.ts`)                                     |
| `npm run lint` / `npm run fix-lint` | `ray lint` (ESLint + Prettier)                                                              |
| `npm test`                          | vitest — hermetic, no network                                                               |
| `npm run test:live`                 | resolves real posts against threads.com — needs network                                     |
| `npm run publish`                   | publish to the Raycast Store                                                                |

## Architecture

Manifest-driven: every entry in `package.json` → `commands` maps 1:1 to a `src/<name>.tsx`.

- **URL-builder commands** — `feed`, `activity`, `search`, `view-profile`, `view-insights`,
  `quick-thread`, `quick-follow`, `new-thread`. Each constructs a URL and opens it.
  `src/lib/post-intent.ts` and `src/lib/follow-intent.ts` are pure URL constructors.
- **`src/download-thread-media.tsx`** — resolves a post, then downloads each item.
  - `src/lib/threads-post.ts` — resolves any Threads link to `{ canonicalUrl, code, media[] }`.
  - `src/lib/media-files.ts` — path reservation, image conversion, content-type→extension
    mapping, URL redaction. The file-destroying mistakes live here, which is why it is
    separated and tested hardest.
  - `src/lib/download-media.ts` — streams one media URL to disk with a progress toast.

## Resolving a post

The extension used to call two third-party scrapers. Both are dead:
`api.threadsphotodownloader.com` has no DNS A record at all, and `dolphinradar.com` answers
`HTTP 200` with `{"code":24001,"message":"Post not found"}` for public posts. The old code
read the media list off that body without checking `code`, threw a `TypeError`, swallowed
it, and reported "No images or videos found in this Threads post" — so every failure blamed
the post.

It now reads threads.com directly. **Two behaviours depend on sending a crawler User-Agent**
(`CRAWLER_USER_AGENT` in `src/lib/constants.ts`):

1. **Media is only in the HTML for a crawler.** A browser UA gets a JS shell with no media
   and no Open Graph tags.
2. **`/share/<id>/` only redirects for a crawler.** A browser UA gets `200` and no redirect;
   a crawler UA gets a 30x to `/@user/post/<code>`. `fetch` follows redirects, so
   `response.url` is the canonical URL — that is the entire share-link implementation.

The page embeds the surrounding feed, so the shortcode also appears in unrelated nodes,
including bare `{"code":"…"}` back-references carrying no media. `indexBraces` makes one
string-aware pass recording where each structural `{` closes; `findPostNode` walks outward
from each occurrence and accepts the innermost object that both declares this `code` **and**
yields media, keeping a media-less match as a fallback so a text post still resolves.

> 🚨 **Only `<script>` contents are scanned, never the whole document.** `indexBraces` treats
> every `"` as a JSON string delimiter, so one unbalanced quote earlier in the page — `5"
> nails` in body text, or a quote inside an HTML comment — leaves the scanner stuck "inside a
> string" and the payload's braces are never indexed at all. The post then fails with
> "Couldn't read this post's media" for a reason that has nothing to do with the post. Real
> pages survive only by luck: their ~340 quotes outside `<script>` happen to be even. Each
> block is scanned independently so one bad script cannot corrupt another; a document with no
> script tags is scanned whole, which keeps bare-JSON fixtures working.

> **The one-pass index is load-bearing, not a micro-optimisation.** Brace-matching forward
> from each candidate rescans toward the end of a ~1 MB document once per candidate, so a
> caption full of `{` made resolution quadratic — 11s for 5,000 braces, versus 5ms now. A
> fixture in `npm test` asserts it stays under 1.5s.
>
> A known ceiling remains: cost is quadratic in the number of *back-references*, measured at
> 10 refs → 2ms, 500 → 27ms, 2000 → 272ms. Real pages carry 4–10. Cache parsed candidate
> intervals if a page ever arrives with hundreds.

Two more things the parser must keep doing, each covered by a fixture:

- **Treat the payload as untrusted.** It is remote JSON matched against hand-written types.
  Every container is shape-checked (`Array.isArray`, null filtering) and every candidate URL
  must parse as absolute `https` with no embedded credentials — so a shape change surfaces as
  a readable error, not `candidates.reduce is not a function`.
- **Validate the input URL.** Only `https`/`http` on an allowlisted host, no credentials, and
  `http` is upgraded to `https` before the request: the whole flow depends on trusting a
  redirect, so it must never be issued in the clear.

Media URLs are signed and **~1 KB long**. Never truncate one — it returns `403 Bad URL hash`.

## Downloading

### Kind comes from the payload; extension comes from the response

`ThreadsMedia` carries `kind: "image" | "video" | "audio"` (the public API's `media_type`
vocabulary), decided by which container the post used. The response header then refines the
*extension* within that kind. **Both halves are load-bearing, and each fails the other way:**

- A `.jpg` URL is served as `image/webp` on some posts and `image/jpeg` on others (both
  observed 2026-09-09), so trusting the URL writes WebP bytes into a `.jpg` — which several
  macOS apps refuse to open.
- A voice post is served as `Content-Type: video/mp4` while being AAC audio in an M4A
  container with no video track, so trusting the header files every voice post as a video.

Keep `EXTENSION_BY_CONTENT_TYPE` broad for the same reason — trimming it to "formats we have
seen" fails silently, and `image/jpeg` turned up after `image/webp` looked universal.

**The audio override is deliberately narrow:** only `video/mp4` on an audio kind becomes
`.m4a`. Overriding every non-audio type would rename an honestly-declared container — an
`audio/webm` landing as `.m4a` — the same mislabelling in the other direction. Raw
`audio/aac` is an ADTS stream, not MP4, so it is `.aac`.

**Voice posts live at `audio.audio_src`**, not in a versions array — `media_type: 11` in the
payload. A post with none of `video_versions`, `image_versions2`, or `audio` genuinely has no
media (a text post is `media_type: 19`).

### Never overwriting a file

> 🚨 **`reservePath` claims BOTH the final path and its `.part` sibling with `wx`.** Reserving
> only the `.part` leaves the later `rename()` free to overwrite an unrelated file of the
> final name — `rename` does not care that the target exists, so a second download of the same
> post silently destroyed the first. `sips --out` has the identical trap, which is why image
> conversion reserves its destination the same way. Both are covered by tests in
> `src/lib/media-files.test.ts`; do not "simplify" the double reservation away.

Content streams into the `.part` file and is renamed only on success, so a half-written
download can neither be mistaken for a complete one nor squat on the name a retry wants.

### The rest of the download path

- **Requires `image/*`, `video/*`, or `audio/*`.** An expired signed URL can answer `200` with
  an HTML error page; writing that to disk as `.mp4` is worse than failing.
- **Rejects an empty body.** A `200` with zero bytes would otherwise pass `existsSync` and be
  reported as a download.
- **Handles a missing `Content-Length`** — Threads omits it on some images, so progress falls
  back to bytes downloaded rather than sitting at "0%".
- **Bounds the whole transfer** with `AbortSignal.timeout`, so a stalled CDN socket cannot
  leave the command spinning. That timeout arrives as an abort, which is why `failToast` gets
  `ignoreAbort: false` — it is the one abort the user must be told about.
- **Uses `handle.createWriteStream()`**, never `createWriteStream("", { fd: handle.fd })`. The
  latter leaves the `FileHandle` and the stream both owning the descriptor and emits
  `File descriptor N closed but not opened in unmanaged mode` on close.
- **Redacts signed CDN URLs** with `redactUrl` before any log line or Copy Error payload.
  Those `oh`/`oe` parameters are a working, time-limited grant of access to the media, and the
  user pastes Copy Error into bug reports.
- **Refuses a concurrent run.** A no-view command can be relaunched while the first is still
  going, and someone who thinks a long download has stalled will do exactly that.

### Image conversion

`convertImage` shells out to macOS `sips`, which reads WebP — so no image dependency is
needed. It never throws: the download has already succeeded by the time it runs, so a problem
returns `{ path, skipped }` with the original path and a reason, and the caller logs it.

- **A file already in the requested format is left alone.** Threads serves JPEG for plenty of
  posts, so "download as `.jpg`, then convert to JPEG" is an ordinary path — and converting a
  format to itself reserves a destination next to the file just downloaded, producing
  `name (1).jpg` and deleting the original.
- **`sips` exits 0 having produced nothing usable**, so the output is `stat`-ed for a nonempty
  regular file before the original is removed.
- **`sips` rejects a `--` separator**, so passing an absolute path (via `resolve()`) is the
  guard against a path being read as an option.
- On Windows, or if `sips` refuses the file, the original is kept rather than losing the
  download.

## Posts that cannot be downloaded

Threads redirects a post it will not serve to a signed-out request to `/?error=invalid_post`,
for **every** user agent tried (Googlebot, bingbot, facebookexternalhit, Slackbot, Discordbot,
desktop Chrome, mobile Safari). `resolveThreadsPost` detects that `error` parameter and reports
a refusal; without it the failure read as "That link didn't resolve to a Threads post", which
sends you looking in the wrong place.

**What it is NOT — measured, not assumed** (2026-09-08, post `DdCaCPID3Fe`):

- **Not a `/share/` bug.** Other share links resolve fine, including to a text-only post and a
  video post; both are live cases.
- **Not per-account.** Sibling posts from the same public account resolve fine anonymously.
- **Not canonical-vs-share.** The canonical `/@user/post/<code>` URL bounces identically.
- **Not flaky, not rate limiting.** Four consecutive retries bounced while a control post
  fetched fine in the same minute.
- **Not fixable via the embed route.** `/@user/post/<code>/embed` returns `200` for the refused
  post, but the body is a JS shell with no media payload.

So it is per-post, server-side, and not externally visible. The media is not the obstacle: the
CDN URL downloads fine without auth once you have it. Do not "fix" this by widening the
parser — the payload never arrives.

## Logging and testability

**`src/lib/threads-post.ts` and `src/lib/media-files.ts` must not import `@raycast/api`** —
directly, or transitively through `@chrismessina/raycast-logger`, which calls
`getPreferenceValues()`. `@raycast/api` is a runtime-resolved shim with no real entry point, so
importing it makes a module unloadable outside Raycast and therefore untestable. This is the
fleet convention; see the same note atop `raycast-attio/src/lib/export-format.ts` and
`raycast-memory-store/src/lib/url.ts`.

Those two modules therefore **report rather than log**: `resolveThreadsPost` puts its diagnosis
in the value it returns and in its error messages, and `convertImage` returns
`{ path, skipped? }`. The Raycast-side callers — `src/lib/download-media.ts` and
`src/download-thread-media.tsx` — import `logger` and do the logging, prefixed with the module
name (`[download-threads-media]`, `[download-media]`).

`logger.log` is gated by the **Debug Logging** preference; `logger.error` always emits. The
preference must be named exactly `verboseLogging` — that is what the logger reads — and its
three copy fields are fixed fleet-wide by House Style.

**Trade-off to know about:** the concurrency gate in `download-media.ts` is not unit tested,
because that module legitimately imports `@raycast/api`. Verify it by hand if you change it.

## Tests

vitest, colocated as `src/**/*.test.ts`, matching the rest of the fleet. `npm test` is
hermetic. The live suite is `src/**/*.live.test.ts`, excluded from `npm test` and run with
`npm run test:live`.

**The posts the live suite resolves against live in `src/lib/live-posts.json`** — edit that
file, not the test. Each entry records `covers`: the behaviour that regresses if that post
disappears. A deleted post fails the suite, which is a signal to swap in another covering the
same behaviour, not a code defect.

The suite validates the file's shape before using it, so a malformed edit fails with a readable
reason rather than a confusing fetch mismatch. In particular it rejects a **`/share/` id pasted
into `code`** — they are different identifiers, and the share URL puts the wrong one right in
front of you: `/share/InQUBOY9S/` resolves to code `DcTZYVBkhjU`.

Write tests against failures that actually happened, and check they can fail. Several here were
green while asserting nothing until that was verified — a fixture built by `sips` that silently
skipped when `sips` refused, a "preserves the original" test that compared filenames rather than
bytes, and rejection tests that passed because the network failed rather than because validation
ran.

### If media resolution breaks

It scrapes an undocumented internal payload, so assume the shape moved. Get ground truth first:

```bash
UA='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
curl -s -A "$UA" -L "https://www.threads.com/@muse/post/DdCYkFvlDvi" -o /tmp/post.html
grep -c '"video_versions"' /tmp/post.html   # 0 means the payload shape moved
```

Then `npm test` for the parser fixtures, and `npm run test:live` for the real posts.

## Conventions

- **The top CHANGELOG entry's date is `{PR_MERGE_DATE}` — never a real date.** Raycast CI
  substitutes it on merge, so writing today's date ships a wrong one and has to be corrected by
  hand. Only already-merged entries below it carry real dates.
- **House Style applies.** Every `Toast.Style.Failure` carries a Copy Error action — use
  `showError` / `failToast` from `@chrismessina/raycast-kit` rather than hand-rolling, and
  `countOf` over `${n} items`.
- **No `any`.** Never hand-define `Preferences` / `Arguments` — use the ambient
  `Preferences.CommandName` / `Arguments.CommandName` namespaces `ray build` generates into
  `raycast-env.d.ts` (gitignored; run a build if TypeScript cannot find them).
- **Fire a loading toast before any await that takes visible time.** A silent window reads as a
  stalled command.
- **Multi-item work reports per item and does not abandon the rest on one failure.**

## Gotchas

- **`tsconfig` is `module`/`moduleResolution: Node16`**, which is what lets
  `@chrismessina/raycast-kit/bytes` resolve. The scaffold default (commonjs + node10) ignores
  `exports` maps and fails every subpath import with `TS2307`. Don't reach for `bundler` — it
  requires `module: es2015`+ and is rejected with `TS5095`.
- **`ray publish` does not read `.gitignore`.** It copies the extension root minus a fixed list
  (`.git`, `.github`, `.direnv`, `.swiftpm`, `.raycast-swift-build`, `compiled_raycast_rust`,
  `compiled_raycast_swift`, `node_modules`, `raycast-env.d.ts`) — verified against the installed
  `@raycast/api`. Anything else on disk ships, however thoroughly git ignores it, so a file that
  must not be published has to live outside the extension root.
- **Bumping `vitest` may crash npm** with `Cannot read properties of null (reading 'edgesOut')`,
  an arborist bug while re-resolving vitest 4's optional `@vitest/browser-playwright` peer.
  `npm install --legacy-peer-deps` gets past it; once the lockfile is complete, plain
  `npm install` / `npm ci` work normally, so a fresh clone is unaffected.
- **`raycast-env.d.ts` is gitignored and generated.** A fresh clone fails `tsc` with
  `Cannot find namespace 'Arguments'` until `npm run build` has run once.
- **A `package.json` preference change needs a full Raycast restart**, not a hot reload — and
  restarting clears preference values that were entered but never committed.
- **`ray build` (esbuild) does not typecheck.** Run `npx tsc --noEmit` too.
