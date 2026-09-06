# Implementation plan

Do one milestone at a time. Preserve the product specification. The foundation is intentionally a small executable preview with a tested service boundary, not a claim that live playback already works.

## M0 — Foundation (implemented)

- Four-command Raycast manifest, Windows/macOS platforms, correct subtitles and search keywords.
- Strict TypeScript, pinned Raycast API, reproducible lockfile, WSL/Node instructions.
- Domain types, search ordering and output validation, scoped active-player controller.
- Demo service with fictional players/music and independent queue-entry IDs.
- Five-view Music shell, collections, contextual playback/volume/queue actions, repeat/shuffle state.
- Authenticated HTTP command transport tested through injected fetch; not wired to a live server.
- Product decisions, API notes, test matrix and continuation prompt.

Known preview limits: search renders only the first 100 results, collections are not paginated, no real audio/events/grouping, quick commands explain demo-only behavior, queue simulation lasts one command session, artwork uses built-in icons, some richer actions are specified but not built.

## M1 — Verified live adapter and connection setup (implemented against fixtures; live validation pending)

Files: add `src/services/live.ts`, `src/services/wire.ts`, decoder tests and sanitized fixtures; extend `src/runtime.ts` and `src/services/http-client.ts`.

1. Connect to a user-configured direct Music Assistant server. Use password preferences; do not discover or copy secrets from unrelated projects.
2. Read server version/API schema and the running server's `/api-docs/commands.json` and `/api-docs/schemas.json` where available. Record the supported version range and fixtures. Development branch references are clues, not proof of installed-server compatibility.
3. Implement decoding of players, queues, media search and library browsing from `unknown`. Explicitly handle missing volume/artwork, unavailable media, and schema drift.
4. Implement all `MusicService` methods from verified commands. Keep `HttpCommandClient` for short-lived commands initially; raw HTTP result is not a WebSocket envelope.
5. Resolve target player → effective queue based on active source, group leader, and queue availability. Refuse unsupported foreign-source queue actions.
6. Derive persistent scope from server ID plus authenticated user ID (stable IDs, no token). Reuse one selection in Music and quick commands.
7. Add setup/recovery UI inside Music. Missing URL/token opens preferences with a helpful reason. Disable demo only after a real service can be created; never automatically select a speaker.

Acceptance: real player discovery and artist/album/track lookup work; Enter on player persists; Enter on track plays on that player; all three quick commands control the same output; no-player/offline/auth failures give actionable messages; tests prove exact command names/args and runtime decoding. Keep demo selectable for isolated UI work.

Implemented: authenticated HTTP runtime, server/user-scoped active player, strict wire decoders, player/queue discovery, queue ownership resolution, media search/library browsing, artist/album drilldown, playback/volume/mute/repeat/shuffle/queue mutations, setup recovery, sanitized fixtures, and exact-command tests. The current official source contract is covered by automated tests. A real server was not available in this workspace, so checks involving actual audio and the running server's reported version/schema remain open in `VALIDATION.md`.

## M2 — Search, paging and collection navigation (next)

Depends on M1. Files: `src/ui/music-browser.tsx`, new search hook, service paging types if necessary.

1. Replace first-page-only UI with Raycast pagination. Do not load all tracks up front.
2. Independently page mixed search types; keep player-first sections and the five-artist empty-query preview. Deduplicate by type/provider URI, not display name.
3. Preserve query/selection on view changes and navigation. Cancel obsolete searches and clear incompatible old-view rows immediately.
4. Artist drilldown: album grid plus top/library tracks through nested native views. Album drilldown: disc/track ordering. Add track → artist/album actions.
5. Add artwork decoding/proxy URLs/cache without embedding access tokens in URLs. Use fallbacks on missing/broken artwork.
6. Empty/slow/partial-error cases must leave refresh/preferences/output recovery actions accessible.

Progress: canonical `proxy_id` artwork URLs are implemented for internal album, track, artist, and queue-item images. URLs preserve reverse-proxy base paths and contain no credentials. Search/collection pagination and the remaining navigation work are still pending.

Acceptance: a library larger than 100 tracks is fully navigable; late responses cannot overwrite newer queries; album/artist artwork and Back navigation work on both hosts; search order matches the spec.

## M3 — Playback workspace and queue completion

Depends on M1; M2 supplies large-library UI. Files: `src/ui/session.tsx`, `player-actions.tsx`, `queue-view.tsx`, new Now Playing and volume form components.

1. Add Now Playing detail with actual title/artist/album, elapsed/total time, output, repeat/shuffle and volume. It is nested in Music, not another command.
2. Implement exact volume, seek, mute, repeat and shuffle based on current capabilities/state. Serialize/coalesce volume changes per player. Never let a render-time value overwrite an external change.
3. Complete queue pagination, Play Entry, Move Next/Up/Down, Remove and confirmed Clear. Use queue-entry IDs and refetch after changes. Handle concurrent edits made elsewhere.
4. Add event synchronization: authenticate WebSocket after initial server info, correlate messages, assemble partial results, react to player/queue events, reconnect with bounded backoff, reauthenticate, and refresh. Alternatively bounded polling can be the first working slice, but document its cadence and cleanup.
5. Unmount closes subscriptions/timers/requests. Quick commands must terminate cleanly. Refresh external changes without stealing list selection.
6. Remove hardcoded Demo titles/toasts from live paths; preview labels remain when using the demo adapter.

Acceptance: current media changes while Music is open, queue edits and duplicate songs behave correctly, repeat cycles through all three modes, no leaked sockets/timers, timeout never duplicates a queue mutation. Keyboard checks verify volume targets highlighted player while transport targets active player.

## M4 — Players, groups and Sendspin management

Depends on M1 and M3 target resolution. Files: add grouping domain/service contract, `src/ui/group-editor.tsx`, Players details/actions and decoder fixtures.

1. Model group compatibility, leaders/members, supported features and sources from the verified server schema. Current `capabilities.grouping` is only a placeholder, insufficient for production permissions.
2. Add Players-only Manage Group action. Show compatible available members, selected leader and current membership; distinguish individual/group volume.
3. Implement join/leave and membership edits first; add group creation only where the server/provider supports it.
4. Preview disruptive changes in a confirmation with concrete output/member names. Refetch actual player/queue state after applying.
5. Exercise existing Sendspin endpoints. No audio receiver, pairing daemon, browser playback engine, or Home Assistant dependency.

Acceptance: compatible group operations work; incompatible/offline combinations are unavailable with explanations; grouped playback resolves the correct queue; leaving/rejoining does not silently redirect saved output to another room. If the user's server lacks compatible players, record native integration as pending, not passed.

## M5 — Cross-platform release readiness

Depends on all previous milestones. Files: manifest/preferences/README/CHANGELOG/assets/metadata as needed.

1. Run every required item in `VALIDATION.md` on Windows and macOS; verify actual shortcuts, layouts, navigation and toast recovery.
2. Switch production preference defaults away from demo, make configuration onboarding accurate, and decide whether to retain a clearly developer-oriented demo option.
3. Replace placeholder icon, create native screenshots, finalize README and CHANGELOG, run Raycast Store lint/build checks.
4. Verify account author, command discoverability, supported server versions, token handling and dependencies. Do not add more top-level commands.

Acceptance: both host test records exist, live scenarios pass, no fake controls or unimplemented paths are presented as functional, and Store checks pass. Prepare a PR only if requested; publishing is not part of this foundation request.
