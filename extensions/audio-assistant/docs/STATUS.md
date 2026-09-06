# Status and validation

Updated September 6, 2026. This is the single record of implementation status, validation, and remaining work. Product and protocol details live in the [development guide](DEVELOPMENT.md). Historical milestone logs are preserved in Git rather than separate handoff/roadmap files.

## Current implementation

The extension has a working live HTTP adapter and optional, explicitly labeled demo mode. It is beyond the original foundation stage. Live mode is the default; demo produces no audio and its queues reset when Music closes.

- Four commands and five root views, with explicit server/user-scoped output selection.
- First-launch credential onboarding form directly in the Music command, testing connectivity, supporting demo mode, and persisting to LocalStorage without requiring manual extension preferences.
- 3-part structured dropdown action shortcut preferences with reasonable defaults (`Alt+Enter` Play/Pause, `Alt+.` / `Alt+,` Next/Prev, `Ctrl+Alt+N` Play Next, `Alt+A` Add to Queue, `Ctrl+Space` Browse Artist, `Ctrl+Shift+Space` Browse Album, `Alt+M` dynamic Mute/Unmute Player toggle, `Alt+=` / `Alt+-` Volume, `Alt+Q` Queue, `Alt+S` Shuffle, `Alt+R` Repeat, `Ctrl+R` Refresh, `Ctrl+.` Preferences), visual toasts on Repeat/Shuffle/Mute toggles, and a "Restore Default Shortcuts" action.
- Search pager warnings accumulation across pages, resilient search revision tracking, and inactive queue loading isolation.
- Paged library lists/grids, independently paged All discovery, cancellable searches, partial discovery recovery, and cached collection browsing.
- Artist albums and tracks together on one searchable screen; root Artists/Albums retain grids. Album tracks follow disc/track order; related-media actions and album/track artwork are implemented.
- Playback, Play Next, append, volume steps, mute, repeat, shuffle, queue inspection, and non-current queue-entry removal. Queue loading includes entries beyond the first 200.
- Shared state across pushed navigation, capability checks for Next/Previous, and the user's native focus/text-editing/action-panel fixes.
- Available/Group/Offline player sections, compatible synced membership addition/removal, static-member protection, and effective queue resolution. All excludes offline players.
- Updated icon and three ordered Store screenshots; user originals retained separately.

The last code/assets update addressed PR review feedback (warning preservation across search pages, search revision sync, inactive queue loading failure isolation) and added first-run credential onboarding and customizable action keybindings.

## Validation evidence

| Evidence                            | Result and limits                                                                                                                                                                                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latest code validation, September 6 | 41 automated tests, TypeScript, ESLint, Prettier, and all four production bundles passed in WSL. Coverage includes warning accumulation, inactive queue isolation, and shortcut customization. These do not prove native keyboard/layout behavior.                    |
| Official submission, September 6    | Publisher accepted manifest/package, icon, metadata, lint, and formatting; existing PR updated successfully.                                                                                                                                                          |
| Read-only live smoke, September 5   | Music Assistant 2.10.2/schema 65: authentication, scoped identity, player/effective queue decoding, All/Tracks/Artists/Albums loading, pagination signals, typed search, and artist/album browsing passed.                                                            |
| Artwork smoke, September 5          | Canonical image proxy returned unauthenticated JPEG HTTP 200. Decoded art was available for 19/20 sampled albums, 14/20 tracks, and 5/20 artists; missing source metadata uses fallbacks.                                                                             |
| Group API verification, September 6 | Running server command/schema endpoints confirmed membership arguments and fields. Tests cover compatibility, static members, followers, active groups, stale state, and queue ownership. Automated validation did not change live membership or verify audible sync. |
| Native Windows                      | Development bundle previously compiled and attached. User reported broad working playback and later supplied native screenshots and keyboard fixes. This is useful user evidence, not completion of every scenario below.                                             |
| Native macOS                        | No recorded host validation.                                                                                                                                                                                                                                          |
| Documentation cleanup, September 6  | Consolidated seven historical documents into two, checked current behavior against source and recent commits, and removed stale plans/status claims. No runtime behavior changed.                                                                                     |

Tests cover domain policies, saved output isolation, strict wire decoding, HTTP errors/cancellation/no replay, exact live command arguments, queue identity/loading, paging races, shared route state, grouping, and shortcut mappings. Fixtures contain sanitized source shapes; they do not substitute for a running server.

`npm run test:live` is the read-only smoke harness. Provide connection settings through environment variables as defined in `scripts/live-smoke.ts`; never commit real settings. A successful WSL build is not evidence that Raycast rendered or imported the extension.

## Remaining work

These are known limitations or future improvements, not features already exposed as working controls. Choose a bounded slice when more implementation is requested; keep it in a separate commit.

| Area                     | Remaining work                                                                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Large collections/search | Artist/album collections currently load and render their full result sets. Add rendering pagination if needed. Typed global provider search is bounded by the verified API limit; do not invent an offset parameter. |
| Live state               | No event subscription or periodic polling. Add bounded refresh or a fully authenticated/reconnecting event client with cleanup, without stealing focus or replaying mutations.                                       |
| Playback workspace       | Dedicated Now Playing details, exact volume entry, and seek controls are not implemented.                                                                                                                            |
| Queue editing            | Play Entry, Move Next/Up/Down, and confirmed Clear are not implemented. The current UI offers inspection and removal of non-current entries; large queues load in batches before rendering.                          |
| Groups                   | Permanent group creation and broader group editing UI are not implemented. Existing compatible membership editing is implemented but still needs recorded audible/native validation.                                 |
| Compatibility/release    | Establish a minimum supported server version and finish Windows/macOS regression evidence. Submission does not close these validation gaps.                                                                          |

## Outstanding validation checklist

Record host/app/server versions and concrete outcomes when running these checks. Do not mark them passed from mocks, a bundle, screenshots alone, or a general report that playback works. These apply to current functionality; test future controls when implemented.

### Live behavior

- [ ] Missing settings, invalid token, forbidden operation, server unavailable/timeout, setup-required server, and reverse-proxy connection behavior.
- [ ] No saved output sends no playback mutation; selecting/reopening/quick commands use the same scoped output; removed/offline output never falls back to another room.
- [ ] Play Now vs Play Next vs append, empty queues, duplicate songs, and unsupported media on the actual server.
- [ ] Effective queue ownership for a different active source, grouped child/leader, and unsupported foreign source.
- [ ] Rapid volume steps, external volume changes, mute, unavailable controls, repeat modes, explicit Next during repeat-one, and shuffle.
- [ ] Queue loading beyond 200 entries, removal of duplicate-song entries, and concurrent external queue edits.
- [ ] Library paging beyond 100 tracks, late search responses, empty libraries, missing artwork, and partial errors.
- [ ] Compatible group joins/removals, disruption confirmation, static-member protection, refreshed queue ownership, and audible multi-player synchronization.
- [ ] Connection loss/auth expiry recovery without duplicate mutations.

### Native Windows and macOS

- [ ] Record Raycast/host versions; discover all four commands by Audio Assistant / Music Assistant.
- [ ] Five root views, Players sections/detail, grids, combined artist List, artwork, loading/empty/error states, scrolling, and Back/query restoration.
- [ ] Enter actions, repeated Play/Pause, native action panel, Shift capitalization, select/copy/paste, and hotkeys across root and pushed views.
- [ ] Physical Ctrl+= / Ctrl+- on the intended keyboard layout; volume targets highlighted player while transport targets saved output.
- [ ] Rapid actions/refresh preserve search focus and usable results; quick commands show feedback and exit; closing Music cleans up resources.

The icon, screenshot preparation, and publisher checks are already recorded as passed above. They are not outstanding checklist items. Do not describe the extension as fully cross-platform validated until the applicable live/native gaps are closed.
