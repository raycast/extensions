# AGENTS.md

Orientation for any coding agent working in this repository. It covers the things
that are not obvious from reading a single file, and the invariants that are easy
to break silently.

## Commands

| Script | What it does |
| --- | --- |
| `npm run dev` | `ray develop` — runs the extension in Raycast development mode |
| `npm run build` | `ray build` — the default bundle build |
| `npm run lint` / `npm run fix-lint` | `ray lint`, optionally auto-fixing |
| `npm run sync-runner` | Copies the downloader runner bundle into `assets/` (see below) |
| `npm run publish` | Publishes to the Raycast Store |

**`ray build` does not typecheck.** It bundles with esbuild, so a type error builds
clean and fails at runtime. `npx tsc --noEmit` is the real gate — run it before
claiming a change compiles.

There is no test runner configured. Do not fabricate one, and do not report a
green build as evidence that behavior is unchanged.

`raycast-env.d.ts` is generated from `package.json`. Never hand-edit it; change the
manifest and run `dev`/`build` to regenerate. The `Preferences` and `Arguments.*`
types come from there — never hand-roll them.

## Architecture

A Raycast extension for downloading files. Three commands — `download` (no-view),
`download-batch` (view), `download-history` (view) — are declared in `package.json`
and implemented at the top level of `src/`. Shared logic lives in `src/lib/`, list
views in `src/views/`, action panels in `src/actions/`.

### Execution model — downloads are detached

`src/lib/downloader.ts` is a **thin adapter over
[`@chrismessina/raycast-downloader`](https://www.npmjs.com/package/@chrismessina/raycast-downloader)**.
It does not spawn `curl` itself and does not parse `curl` output. The package owns
the curl configuration (handed to curl over stdin), the `fail` flag, resume via HTTP `Range`/`If-Range`, stall
detection, and failure classification.

`startDownload` spawns a **runner process that outlives the Raycast command**. It
streams into `<outputPath>.part` and renames atomically on success, so closing the
Raycast window does not kill a transfer. The adapter keeps a
`DownloadHandle { promise, cancel }` shape so callers did not have to change: the
promise is synthesized by watching the runner's status file reach a terminal state.
If the window closes, that promise simply never settles — the download continues and
the runner's own notification reports success and transport failures. Some failure
exits (an empty response, setup, a size mismatch, a failed rename) record the failure
in the status file without a notification, so History is where those surface.

Consequences worth knowing before you change anything here:

- **Never pass a `Range` or `If-Range` header.** The package owns resume and throws
  `DownloadError` with code `"validation"` if you try.
- **`startDownload` can throw `DownloadError` with code `"conflict"`** when another
  live attempt already holds the same `outputPath`. Surface it; never retry it in a
  loop.
- A live download may have `.state`, `.claim` and `.headers` sidecar files next to
  its `.part`, plus short-lived `<name>.<pid>….tmp` files from atomic writes. Anything
  that lists a download directory must filter them out by prefix, stale ones included.
  Since 0.2.1 the URL and request headers reach the runner and curl over stdin, so no
  file holds them.
- The `defaultTimeout` preference is passed as `stallSeconds`, **not** a wall-clock
  limit. Once connected, a transfer is abandoned when its speed stays under 1 KiB/s
  (the package's default `speedLimitBytes`, which Fetch does not override) for that
  many seconds, so one at or above that rate takes as long as it takes. Connecting is
  bounded separately, by curl's 30-second connect timeout. Nothing counts
  this down in the UI: the status carries no deadline, and rebuilding curl's timer
  from meter readings misfires (see the downloader's `TODO.md`).

### The runner asset is a hard shipping invariant

`assets/raycast-downloader-runner.js` is a **committed copy** of the package's
`dist/runner.bundle.js`, produced by `scripts/sync-runner.mjs` and wired to
`predev`/`prebuild`.

It is committed rather than generated at publish time because `ray publish` runs its
own build and never invokes repository scripts, and a published extension ships no
`node_modules` — `assets/` is the only location left where the package's runner
resolver can find the file. **Without it, every download fails in the published
extension only, and works fine in development.**

So: after bumping `@chrismessina/raycast-downloader`, run `npm run sync-runner` and
commit the result. Verify with:

```sh
shasum -a 256 assets/raycast-downloader-runner.js \
  node_modules/@chrismessina/raycast-downloader/dist/runner.bundle.js
```

The two hashes must match.

### Path reservation — releasing is the caller's job

`resolveOutputPath` reserves its result by creating a zero-byte `<path>.part`, so two
concurrent callers can never be handed the same name. Overwrite mode is the exception:
it hands back the direct path even when that `.part` already exists, and the package's
`"conflict"` refusal is what stops a second live attempt there. A reservation that is never
handed to a runner must be **explicitly released**, or later downloads silently shift
onto ` (1)` names for files that were never written.

Both commands do this on every abandonment path: `src/download.ts` releases when
startup fails before the runner takes ownership, and `src/download-batch.tsx` releases
in `prepareItems`' catch (covering cancellation *and* genuine failures, across every
concurrency wave) and in `downloadBatch`'s cancel paths. If you add a path that
resolves an output and then bails, release it.

### Cross-command launching

`src/download.ts` detects curl-style range patterns (`file[001-025].zip`) via
`hasRangePattern`, expands them, and re-launches `download-batch` with
`{ urls, outputDirectory }` in `launchContext`.

Every launch goes through `launchOrShowError` in `src/lib/launch.ts`, never a bare
`launchCommand`: the call rejects when Raycast cannot open the target, and the helper
turns that into a failure toast with Copy Error instead of an unhandled rejection.
`download-batch` inspects `launchContext` on mount and auto-starts; otherwise it
renders a form that pre-fills from the clipboard and can import open tabs via
`BrowserExtension.getTabs()`.

Any new "feed URLs into the batch" entry point should push into this same
`launchContext` shape rather than duplicating the download pipeline.

### Batch cancellation fans out

A retry starts its **own** single-item batch, which can run alongside the original.
The views therefore receive a `BatchControls` fan-out (`cancel` / `cancelItem`) over
every live batch, not one `BatchDownloadHandle`. Register any new batch with
`trackBatch` — a handle kept out of that set cannot be canceled from the UI.

### URL and filename resolution

`src/lib/url-utils.ts` owns all URL and filename logic. `resolveOutputPath(url, dir,
overwrite)` is the shared pipeline: a HEAD request via `fetchHeadInfo`, filename
extraction (`Content-Disposition`, falling back to the URL path), extension inference
from the content type, then either the direct path (overwrite) or a reserved unique
path from the package's `uniquePath`. `fetchHeadInfo` parses the **last** HTTP
response block so redirects do not return intermediate headers.

`cleanUrl` strips trailing prose punctuation from pasted input, but only *unbalanced*
closing brackets — a URL legitimately ending in `)` survives.
`extractUrlStringsFromText` handles markdown links and bare URLs with dedupe. Range
expansion (`expandRangeUrl` / `expandAllRangeUrls`) infers zero-padding from the start
value, supports descending ranges, and caps each range pattern at 500 URLs
(`expandAllRangeUrls` concatenates patterns, so the total can exceed that).

### Preferences

`src/lib/preferences.ts` wraps `getPreferenceValues` with parsing and validation
(numeric preferences arrive as strings from Raycast), expands `~`, and caches the
result. Use `getPreferences()` everywhere. `maxParallelDownloads` is capped at 10
regardless of user input.

The two logging toggles **must** keep their exact names — `verboseLogging` and
`strictRedaction` are the keys `@chrismessina/raycast-logger` reads internally, the
second per call from 1.5.0 on. A renamed toggle silently does nothing. `src/lib/logger.ts` deliberately does not read preferences itself, which also
avoids a circular import.

### History

`src/lib/history.ts` wraps the package's `createDownloadHistory` over Raycast
`LocalStorage`, keeping the last 100 records. Records **must** be keyed on the
runner's ticket id (`DownloadResult.id`) — `reconcileHistory` sweeps status files by
that same id, so a different id produces a duplicate record instead of an update.
Recognized signed URLs (by their query parameter names) are stripped by the
`omit-signed` URL policy before storage.

History stores no resume state; "Retry Download" simply relaunches `download` with
the URL again, through `launchOrShowError`.

`reconcileHistory` REPLACES a row from its status file, and a status file carries no
URL. So whenever a command records a row itself, `addToHistory` / `addBatchToHistory`
clear that download's status at once; otherwise the next sweep strips the row's URL
and with it Retry and Download Again. A batch retry records its own result for the
same reason. What still reaches History through the sweep, without a URL: downloads
that finished with no command open, and started batch items that were canceled.
One race remains: a sweep already in progress when a row is written can still
replace it, because the replace happens inside the package.

### UI conventions

`src/lib/progress.ts` owns toast side effects for the no-view single-download path.
These are **toasts, not HUDs, deliberately**: `showHUD` closes the main window, and
`showToast` degrades to a non-interactive notification once the window is closed —
so a HUD anywhere earlier in the flow silently strips the actions off the completion
toast. Updates are throttled per filename, not globally, on `performance.now()`: a
wall-clock step backward would otherwise suppress every update until it caught up.

Every `Toast.Style.Failure` needs a way to copy the error; use `showError` from
`@chrismessina/raycast-kit`, which supplies one. `Toast.Style.Animated` is only for
work that is actually in flight — replace the toast rather than mutating `style`,
since flipping it on a presented toast leaves the spinner running.

Return runs the **first** action in an `ActionPanel`, in every state the row can be in.
On a download row, a destructive action (Cancel, Delete) is never first: on an
in-flight batch row, Copy URL comes before Cancel for that reason (Cancel is then
⌘↵ as well as ⌃X). While filenames resolve there are no rows, so the empty view puts
Open Download Folder ahead of Cancel All.

Copy is US English ("Canceled"), but the status and error-code value is the
package's `"cancelled"` and stays spelled that way: History stores it, and the
downloader emits it.

The extension is macOS-only (`platforms: ["macOS"]`), so plain `{ modifiers, key }`
shortcuts are correct; prefer `Keyboard.Shortcut.Common` where a semantic match
exists.
