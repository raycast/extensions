# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

A Raycast extension for Threads. Most commands are thin `no-view` wrappers that build a
threads.com URL and `open` it — there is no Threads API client here and no authentication.
The one command that does real work is **Download Threads Media**.

macOS and Windows per the manifest. Requires the Raycast app and `ray` on PATH.

## Commands

| Script                              | Does                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm install`                       | install dependencies                                                                        |
| `npm run dev`                       | `ray develop` — long-lived watcher; run it in a real terminal, never background-and-kill it |
| `npm run build`                     | `ray build -e dist` (also generates `raycast-env.d.ts`)                                     |
| `npm run lint` / `npm run fix-lint` | `ray lint` (ESLint + Prettier)                                                              |
| `npm test`                          | vitest — hermetic, no network                                                               |
| `npm run test:live`                 | resolves the real posts in `live-posts.json` — needs network                                 |
| `npm run publish`                   | publish to the Raycast Store                                                                |

Tests are vitest, colocated as `src/**/*.test.ts`, matching the rest of the fleet. The live
suite is `src/**/*.live.test.ts`, excluded from `npm test` and run on demand.

**The posts the live suite resolves against live in
`/Users/messina/Developer/GitHub/chrismessina/raycast-threads/src/lib/live-posts.json`** —
edit that file, not the test. Each entry records `covers`: the behaviour that regresses if
the post disappears. A deleted post fails the suite; swap in another covering the same
behaviour rather than deleting the case. The suite validates the file's shape first, so a
malformed edit (bad host, unknown kind, duplicate code, missing `covers`) fails with a
readable reason instead of a confusing resolve error.

## Architecture

Manifest-driven: every entry in `package.json` → `commands` maps 1:1 to a `src/<name>.tsx`.

- **URL-builder commands** — `feed`, `activity`, `search`, `view-profile`, `view-insights`,
  `quick-thread`, `quick-follow`, `new-thread`. Each constructs a URL and opens it.
  `src/lib/post-intent.ts` and `src/lib/follow-intent.ts` are pure URL constructors.
- **`download-thread-media.tsx`** — resolves a post, then downloads each media item.
  - `src/lib/threads-post.ts` — resolves any Threads link to `{ canonicalUrl, code, media[] }`.
  - `src/lib/media-files.ts` — path reservation, image conversion, content-type/extension
    mapping, URL redaction. This is where the file-destroying mistakes live, which is why
    it is separated and checked.
  - `src/lib/download-media.ts` — streams one media URL to disk with a progress toast.

### How media resolution works (and why it looks odd)

The extension previously called two third-party scraper APIs. Both are gone:
`api.threadsphotodownloader.com` no longer resolves in DNS at all, and
`dolphinradar.com` answers `HTTP 200` with `{"code":24001,"message":"Post not found"}` for
public posts. The old code read `data.post_detail.media_list` off that body without
checking `code`, so it threw a `TypeError`, swallowed it, and reported the misleading
"No images or videos found in this Threads post".

It now reads Threads directly. **Two behaviours depend on sending a crawler User-Agent**
(`CRAWLER_USER_AGENT` in `src/lib/constants.ts`):

1. **Media is only in the HTML for a crawler.** With a browser UA, threads.com returns a
   JS shell with no media and no Open Graph tags.
2. **`/share/<id>/` only redirects for a crawler.** With a browser UA it answers `200` and
   never redirects; with a crawler UA it 30x-redirects to `/@user/post/<code>`. `fetch`
   follows redirects by default, so `response.url` is the canonical URL — that is the whole
   share-link implementation.

The page embeds the surrounding feed, so the shortcode appears in unrelated nodes too —
including bare `{"code":"…"}` back-references that carry no media. `indexBraces` makes one
string-aware pass recording where each structural `{` closes; `findPostNode` then walks
outward from each occurrence and accepts the innermost object that both declares this
`code` **and** carries media, falling back to a media-less match so a text post still
resolves.

> **Only `<script>` contents are scanned, never the whole document.** `indexBraces` treats
> every `"` as a JSON string delimiter, so one unbalanced quote earlier in the page — `5"
> nails` in body text, or a quote inside an HTML comment — leaves the scanner stuck
> "inside a string" and the payload's braces are never indexed. The post then fails with
> "Couldn't read this post's media" for a reason unrelated to the post. Real pages survive
> only by luck (their ~340 quotes outside `<script>` happen to be even). Each block is
> scanned independently so one bad script can't corrupt another; a document with no script
> tags is scanned whole, which keeps bare-JSON fixtures working.

> The one-pass index is load-bearing, not a micro-optimisation. Brace-matching forward from
> each candidate rescans toward the end of a ~1 MB document once per candidate, so a caption
> full of `{` made resolution quadratic — measured at 11s for 5,000 braces, versus 5ms now.
> `npm test` asserts this stays under 1.5s.

Two more things the parser must keep doing, each covered by a fixture check:

- **Treat the payload as untrusted.** It is remote JSON matched against hand-written types.
  Every container is shape-checked (`Array.isArray`, null-element filtering) and every
  candidate URL must be an absolute `https://` string, so a shape change surfaces as a
  readable error rather than `candidates.reduce is not a function`.
- **Validate the input URL.** Only `https`/`http` on an allowlisted host, no embedded
  credentials, and `http` is upgraded to `https` before the request — the whole flow depends
  on trusting a redirect, so it must never be issued in the clear.

Media URLs are signed and **very long** (~1 KB). Do not truncate them — a shortened URL
returns `403 Bad URL hash`.

### Downloading

`handleDownload` streams to a `<name>.<ext>.part` file opened with `wx` (which both reserves
the name atomically against a concurrent run and avoids a TOCTOU race), then renames only on
success — so a half-written download can never be mistaken for a complete one, nor squat on
the name a retry wants. It also:

- **The media KIND comes from the payload; the EXTENSION from the response.** `ThreadsMedia`
  carries `kind: "image" | "video" | "audio"` (the public API's `media_type` vocabulary),
  decided by which container the post used. The header refines the extension *within* that
  kind. Both halves are load-bearing: a voice post is served as `Content-Type: video/mp4`
  but is AAC audio in an M4A container, so trusting the header files every voice post as a
  video; and a `.jpg` URL can be WebP, so trusting the URL writes WebP into a `.jpg`.
- **The audio extension override is narrow on purpose.** Only `video/mp4` on an audio kind
  becomes `.m4a`. Overriding every non-audio type would rename an honestly-declared container
  — an `audio/webm` would land as `.m4a` — which is the same mislabelling in the other
  direction. Raw `audio/aac` is ADTS, not MP4, so it is `.aac`.
- **Voice posts live at `audio.audio_src`**, not in a versions array — `media_type: 11` in
  the payload. A post with neither `video_versions`, `image_versions2`, nor `audio` genuinely
  has no media (a text post is `media_type: 19`).
- **Names the file from the response `Content-Type`, not the URL.** The URL lies and the
  format varies *per post*: a `.jpg` URL comes back as `image/webp` on some posts and
  `image/jpeg` on others (both observed 2026-09-09). Naming from the URL put WebP bytes in a
  `.jpg` file, which several macOS apps refuse to open. Keep `EXTENSION_BY_CONTENT_TYPE`
  broad for the same reason — trimming it to "the formats we have seen" fails silently.
- **Handles a missing `Content-Length`.** Threads omits it on some images, so the progress
  toast falls back to bytes downloaded rather than sitting at "0%".
- **Requires the response to be `image/*` or `video/*`.** An expired signed URL can answer
  `200` with an HTML error page, and writing that to disk as `.mp4` is worse than failing.
- **Bounds the whole transfer** with `AbortSignal.timeout`, so a stalled CDN socket cannot
  leave the command spinning forever. That timeout arrives as an abort, which is why
  `failToast` is passed `ignoreAbort: false` — it is the one abort the user must be told about.
- **Uses `handle.createWriteStream()`**, never `createWriteStream("", { fd: handle.fd })`.
  The latter leaves the `FileHandle` and the stream both owning the descriptor and emits
  `File descriptor N closed but not opened in unmanaged mode` on close.
- **Redacts signed CDN URLs** (`redactUrl`) before they reach a log line or the Copy Error
  payload. Those URLs carry `oh`/`oe` signature parameters and are a working, time-limited
  grant of access to the media; the user pastes Copy Error into bug reports.
- **Converts images with `sips`** when the Image Format preference asks for JPEG or PNG.
  `sips` ships with macOS and reads WebP, so no image dependency is needed; on Windows, or
  if `sips` refuses the file, the original is kept rather than losing the download. `sips`
  exits 0 in cases where it produced nothing usable, so the output is `stat`-ed for a
  nonempty regular file before the original is deleted.

> 🚨 **`reservePath` claims the FINAL path with `wx`, not just the `.part`.** Reserving only
> the `.part` leaves the later `rename()` free to overwrite an unrelated file of the final
> name — `rename` does not care that the target exists, so a second download of the same post
> silently destroyed the first. The same trap applies to `sips --out`. Both are covered by
> checks in `tools/check.ts`; do not "simplify" the double reservation away.

Note `sips` **rejects a `--` separator**, so an absolute path (via `resolve()`) is the guard
against a path being read as an option — not `--`.

### Posts that cannot be downloaded

Threads redirects a post it will not serve to a signed-out request to `/?error=invalid_post`,
for **every** user agent tried (Googlebot, bingbot, facebookexternalhit, Slackbot,
Discordbot, desktop Chrome, mobile Safari). `resolveThreadsPost` detects that `error`
parameter and reports a refusal; without it the failure surfaced as "That link didn't resolve
to a Threads post", which sends you looking in the wrong place.

**What it is NOT, measured rather than assumed** (2026-09-08, post `DdCaCPID3Fe`):

- **Not a `/share/` bug.** Other share links resolve fine, including to a text-only post and
  to a video post. Both are live cases in `npm test`.
- **Not per-account.** Sibling posts from the same public account resolve fine anonymously.
- **Not the canonical-vs-share distinction.** The canonical `/@user/post/<code>` URL bounces
  identically.
- **Not flaky, and not rate limiting.** Four consecutive retries bounced while a control post
  fetched fine in the same minute.
- **Not fixable via the embed route.** `/@user/post/<code>/embed` returns 200 for the
  refused post, but the body is a JS shell with no media payload.

So it is per-POST and the cause is server-side and not externally visible. The media itself
is not the obstacle: the CDN URL for that post downloads fine without auth once you have it.
Do not "fix" this by widening the parser — the payload never arrives.

## Logging and testability

**`src/lib/threads-post.ts` and `src/lib/media-files.ts` must not import `@raycast/api` —
directly or through `@chrismessina/raycast-logger`, which reads `getPreferenceValues()`.**
`@raycast/api` is a runtime-resolved shim with no real entry point, so importing it makes a
module unloadable outside Raycast and therefore untestable. This is the fleet convention
(see the same note atop `raycast-attio/src/lib/export-format.ts` and
`raycast-memory-store/src/lib/url.ts`); an earlier version of this extension aliased a
hand-written `@raycast/api` stub into the test build instead, which no other extension does.

So those two modules report rather than log: `resolveThreadsPost` returns what happened and
puts the diagnosis in its error messages, and `convertImage` returns
`{ path, skipped? }`. The Raycast-side callers — `download-media.ts` and
`download-thread-media.tsx` — import `logger` directly and do the logging, prefixed with the
module name. `logger.log` is gated by the **Debug Logging** preference (`verboseLogging`, the
name the logger reads; the copy is fixed fleet-wide by House Style); `logger.error` always
emits.

**Signed CDN URLs must go through `redactUrl` before any log line or Copy Error payload.**

**Trade-off to know about:** the concurrency gate in `download-media.ts` is no longer unit
tested, because that module legitimately imports `@raycast/api`. It was covered while the
stub existed. Verify it by hand if you change it.

### If media resolution breaks

It is scraping an undocumented internal payload, so assume the shape changed. Get ground
truth before editing:

```bash
UA='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
curl -s -A "$UA" -L "https://www.threads.com/@muse/post/DdCYkFvlDvi" -o /tmp/post.html
grep -c '"video_versions"' /tmp/post.html   # 0 means the payload shape moved
```

Then run `npm test` for the parser fixtures, and `npm run test:live` to resolve the real
posts in `live-posts.json`.

## Conventions

- **The top CHANGELOG entry's date is `{PR_MERGE_DATE}` — never a real date.** Raycast CI
  substitutes it when the PR merges, so writing today's date ships a wrong one and has to be
  corrected by hand every time. The whole fleet uses the placeholder
  (`raycast-attio`, `raycast-ios-apps`, `raycast-central-icon-system` all read
  `## [Title] - {PR_MERGE_DATE}`). Only *already-merged* entries below it carry real dates.

- **House Style applies** (`@chrismessina/raycast-*` extensions): every `Toast.Style.Failure`
  carries a Copy Error action. Use `showError` / `failToast` from
  `@chrismessina/raycast-kit` rather than hand-rolling; use `countOf` over `${n} items`.
- Structured logging via `@chrismessina/raycast-logger` (`logger.debug` / `logger.error`).
- **No `any`.** Never hand-define `Preferences` / `Arguments` — use the ambient
  `Preferences.CommandName` / `Arguments.CommandName` namespaces that `ray build`
  generates into `raycast-env.d.ts` (gitignored; run a build if TypeScript can't find them).
- Fire a loading toast **before** any await that takes visible time. A silent window reads
  as a stalled command.
- Long-running/multi-item work reports per item and does not abandon the rest on one
  failure.

## Gotchas

- **Bumping `vitest` may crash npm** with `Cannot read properties of null (reading 'edgesOut')`
  — an arborist bug hit while re-resolving vitest 4's optional `@vitest/browser-playwright`
  peer. `npm install --legacy-peer-deps` gets past it, and once the lockfile is complete a
  plain `npm install` / `npm ci` works normally. A fresh clone is unaffected.
- **`tsconfig` is `module`/`moduleResolution: Node16`**, which is what lets
  `@chrismessina/raycast-kit/bytes` resolve. The scaffold default (commonjs + node10) ignores
  `exports` maps and fails every subpath import with `TS2307`. Don't switch to `bundler` —
  it requires `module: es2015`+ and is rejected with `TS5095`.
- `raycast-env.d.ts` is gitignored and generated. A fresh clone fails `tsc` with
  `Cannot find namespace 'Arguments'` until `npm run build` has run once.
- A `package.json` **preference** change needs a full Raycast restart, not a hot reload —
  and restarting clears preference values that were entered but not committed.
- `ray build` (esbuild) does not typecheck on its own path; run `npx tsc --noEmit` too.
- `src/lib/threads-post.ts` must stay free of `@raycast/api` imports, or
  `tools/threads-post.check.ts` can no longer run outside Raycast.
