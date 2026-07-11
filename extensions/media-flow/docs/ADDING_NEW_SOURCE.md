# Adding a new source

A "source" is anything that can tell MediaFlow what's playing: an app with an
AppleScript dictionary, a browser tab, or (already covered for free) anything
registered with the macOS Now Playing service via `media-control`. This guide walks
through adding a new **provider** — the enrichment/control layer, following the same
shape as the existing Music and Spotify integrations.

## 1. Copy the template

Start from `src/providers/spotify.ts` — it's the clearest example of the full pattern
(availability check, metadata parsing, control mapping). Copy it to
`src/providers/<your-app>.ts` and adapt the AppleScript and parsing to your target
app's dictionary.

## 2. Implement `SourceProvider`

Every provider implements this interface, defined once in `src/core/types.ts`:

```typescript
export interface SourceProvider {
  id: string;
  displayName: string;
  /** bundle ids this provider can enrich/control (match against media-control output) */
  bundleIds: string[];
  capabilities: ProviderCapabilities;
  isAvailable(): Promise<boolean>;
  getSource(): Promise<MediaSource | null>;
  control?(cmd: PlaybackCommand): Promise<void>;
}
```

where `ProviderCapabilities` is `{ control: boolean; artwork: boolean; seek: boolean }`
and `MediaSource` is the shared shape returned by every provider and by
`media-control` (see `src/core/types.ts` for the full field list — `id`, `appName`,
`bundleId`, `title`, `artist`, `album`, `artworkPath`, `duration`, `position`,
`isPlaying`, `origin`, `url`).

Notes from the Spotify implementation worth carrying over:

- **`isAvailable()`** should be cheap — a `System Events` process-name check, not a
  full metadata fetch. It gates whether `getSource()` even runs.
- **`getSource()`** returns `null` (not a throw) whenever there's nothing to report —
  app not running, nothing playing, script failure. `getMediaSources()` treats a
  thrown error and a `null` result the same way (the source is dropped, nothing else
  fails), but returning `null` explicitly is clearer and faster.
- **Parsing is a pure, exported function** (`parseSpotifyRecord`) separate from the
  AppleScript call itself, so it can be unit-tested without mocking `osascript`.
  Delimiter choice matters: fields are pipe-joined and parsed from the *right* first
  (duration, position, state, urls popped off the end) so a `|` inside a track title
  doesn't break the split — mirror this if your app's titles can contain the
  delimiter you choose.
- **`control()`** maps `PlaybackCommand` (`"play" | "pause" | "playpause" | "next" |
  "previous"`) to your app's AppleScript verbs via a small `Record` lookup table.
- Only set `capabilities.control` / `.artwork` / `.seek` to `true` for things you
  actually implement — `mediaService.controlSource()` checks `capabilities.control`
  before calling `control()`, and falls back to `media-control` otherwise.

## 3. Register the provider

Add one line to `registerAllProviders()` in `src/core/setup.ts`:

```typescript
import { yourAppProvider } from "../providers/your-app";
// ...
registerProvider(yourAppProvider);
```

Registration is idempotent by `id`, so this is safe to call from every command entry
point (and every command does).

## 4. Write tests

Mirror `tests/providers/spotify.test.ts`: mock `runAppleScript`
(`vi.mock("../../src/lib/applescript", () => ({ runAppleScript: vi.fn() }))`) and
cover, at minimum:

- The pure parser: happy path, "stopped"/not-playing, a delimiter-in-title edge case,
  and a malformed/short response.
- `getSource()`: maps a parsed record to `MediaSource` correctly, returns `null` on
  script failure (`runAppleScript` resolving `null`) and on a stopped/empty state.
- `isAvailable()`: true/false based on the process-name check.
- `control()`: asserts the exact AppleScript string sent for at least one command.

Run `npm test` (or scope it with `npm test -- your-provider`) before opening a PR.

## Which apps get which treatment

| App | AppleScript dictionary | Coverage today |
| --- | --- | --- |
| Music.app | Full metadata (`player state`, `current track`) + control; artwork via `media-control` (AppleScript raw `artwork 1` is possible but not implemented) | `media-control` + AppleScript enrichment/control |
| Spotify | Full metadata (`player state`, `current track`, `spotify url`) + control; artwork via `media-control` (the dictionary exposes `artwork url`, but the provider does not fetch it) | `media-control` + AppleScript enrichment/control |
| VLC | Transport control only — no reliable metadata via AppleScript | `media-control` only today; a control-only VLC provider is possible but not implemented |
| Safari / Chrome | No media dictionary — tab title + URL only (YouTube-title heuristic) | Browser tab-title fallback provider (`src/providers/browser.ts`), no position/artwork |
| TIDAL, Deezer, Amazon Music, Firefox | No AppleScript dictionary at all | `media-control`-only — no provider needed or possible today |

If the app you're adding has no AppleScript dictionary, it likely doesn't need a new
provider at all — check first whether it's already covered by `media-control` alone
(true for anything that shows up in macOS's system Now Playing widget). Write a
provider only when there's real enrichment or control to add beyond what
`media-control` already reports.
