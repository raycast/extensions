# Validation record

Foundation verification on 2026-09-05, WSL Linux / Node 22.22.2 / Raycast API 2.2.0:

| Check                              | Result                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`)        | Passed                                                                             |
| Domain, HTTP, live adapter tests   | 18 passed, 0 failed                                                                |
| ESLint                             | Passed without warnings after title fixes; generated Raycast declarations excluded |
| Prettier                           | Passed                                                                             |
| Raycast bundle                     | All four entry points built successfully                                           |
| Raycast manifest/icon validation   | Passed                                                                             |
| Native UI and real server playback | Not tested                                                                         |

M1 fixture verification added strict player/media/queue decoding, server/user scope identity, private-player filtering, active queue resolution, typed and empty searches, artist browsing, non-track queue items, and exact mutation command arguments. These are contract tests against sanitized official-source shapes rather than a connection to the user's server.

The build reported "Raycast is not running" in the WSL environment. This does not invalidate bundling, but it means the build did not verify attachment to a native Raycast instance.

## Live server smoke test

Read-only validation on 2026-09-05 against Music Assistant 2.10.2, schema 65, over its direct local HTTP endpoint:

| Check                                                  | Result                                  |
| ------------------------------------------------------ | --------------------------------------- |
| Bearer authentication and server/user-scoped identity  | Passed                                  |
| Player and effective queue decoding                    | Passed: 8 visible players and 15 queues |
| Empty All / Tracks / Artists / Albums loading          | Passed                                  |
| Library pagination signals                             | Passed for tracks, artists, and albums  |
| Typed cross-library search                             | Passed                                  |
| Artist and album browsing                              | Passed                                  |
| Internal artwork proxy response                        | Passed: unauthenticated JPEG, HTTP 200  |
| Playback, volume, repeat, shuffle, and queue mutations | Not run; fixture contract tests only    |

The sanitized `npm run test:live` harness lives in `scripts/live-smoke.ts`. It accepts the server URL and token only through environment variables and omits user, player, and media names from output.

The Windows-native development extension also compiled and attached to the running Raycast app using Node 24.12.0 and Raycast API 2.2.0. The invoked Computer Use runtime exposed no native app surfaces, so it could not enter preferences or inspect the Raycast window. Do not treat the successful attachment as native UI validation.

Native logs revealed that Raycast renders pushed navigation targets outside their parent's React context: artist/album browsing and the queue initially threw `MusicSession is required`. Each pushed route now creates its own scoped session, and the extension rebundles successfully. Reopening those routes in native Raycast remains a required regression check.

Album artwork follow-up: the live server returned absolute, remotely accessible art for artists, but internal paths plus canonical `proxy_id` values for 56 of 61 albums. The canonical proxy returned an unauthenticated JPEG successfully. Decoder coverage now proves direct remote artwork remains unchanged and internal artwork uses the configured reverse-proxy-safe base URL without credentials. Native display of the fix still requires a fresh Raycast check.

After the decoder change, the live smoke test produced artwork URLs for 19 of the first 20 albums, 14 of 20 tracks, and 5 of 20 artists. The remaining sampled items did not advertise usable artwork metadata.

Music list and queue rows now consume decoded track artwork with a native music-note fallback. Native display remains covered by the cross-platform artwork checklist below.

## Automated foundation checks

Run in WSL using the pinned Node runtime:

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
npm run check
npm run build
```

Tests cover mixed-result ordering, empty-query artist cap, case-insensitive search, missing/stale/offline target refusal, queue identity validation, repeat cycle, volume bounds, scoped saved selection, no mutation before selection, queue insertion/append/duplicate IDs, removal index adjustment, demo paging/cancellation, HTTP raw responses/auth/base paths, error sanitization, malformed JSON, and no mutation retries.

Type checks/lint/build validate API usage and bundling, not actual Raycast rendering or real music playback. The HTTP tests inject fetch; they are not integration tests against a running server.

## Required live checks (pending)

- [ ] Record actual server version/schema, direct/reverse-proxy URL behavior, and sanitized fixtures.
- [ ] First launch without settings, invalid token, forbidden operation, server offline/timeout, setup-required server.
- [ ] No saved output → Play Now shows a toast and sends no mutation.
- [ ] Select player → reopen Music → quick commands use the same server/user-scoped output.
- [ ] Offline/deleted saved output never falls back to another room.
- [ ] Play Now vs Play Next vs append semantics, empty queue, repeated song IDs, unsupported media.
- [ ] Player whose active source owns a different queue; grouped child/leader; foreign source.
- [ ] Volume bounds and rapid shortcuts, unavailable volume, mute, external volume changes.
- [ ] Repeat off/one/all and explicit Next while repeat-one is active; shuffle behavior.
- [ ] Queue paging, moving/removing duplicate songs, external queue edits, clear confirmation.
- [ ] Search paging beyond 100 tracks, late response cancellation, empty libraries, missing art, partial errors.
- [ ] Existing compatible Sendspin endpoints: group, ungroup, membership changes, queue re-resolution.
- [ ] Disconnect/reconnect/auth expiry while Music is open; no duplicate mutations or leaked resources.

## Required native checks (pending on both Windows and macOS)

- [ ] Import/develop using the host Raycast runtime; record app and extension API versions.
- [ ] Search every command by Audio Assistant / Music Assistant; verify subtitles and only four commands.
- [ ] Five dropdowns, list/detail/grid layout, artwork, empty states, keyboard navigation and Back restoration.
- [ ] Enter primary actions, native action panel shortcut, all specified action hotkeys without conflicts.
- [ ] Physical Ctrl+= and Ctrl+- work on both platforms and the intended keyboard layout.
- [ ] Volume targets highlighted player; track/transport actions target saved output.
- [ ] Rapid actions and refresh do not steal focus or display stale rows.
- [ ] No-view commands show appropriate HUD/toasts and exit; view closes without socket/timer leaks.
- [ ] Screenshots and final icon satisfy Store requirements; Raycast Store lint succeeds.

Do not mark any pending checkbox complete from mocked tests or a successful bundle.
