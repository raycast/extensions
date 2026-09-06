# Next-model handoff

The repository contains a compiling demo UI plus an M1 live adapter tested against sanitized current-protocol fixtures. Start with **M2** in `IMPLEMENTATION_PLAN.md`; real-server M1 validation remains pending until a server URL/token are supplied through Raycast preferences.

## Paste this into the next task

> Continue Audio Assistant in this workspace. Read AGENTS.md, docs/PRODUCT_SPEC.md, docs/API_NOTES.md, and docs/IMPLEMENTATION_PLAN.md. Implement M2: paginated search and complete artist/album navigation over the existing MusicService boundary. Preserve exactly four commands, explicit active-player selection, player-first All ordering, the five dropdown views, and shortcut targets. Work in WSL with Node >=22.22.2. Keep server JSON decoding in services, protect credentials, and retain explicit demo labeling. Extend sanitized fixtures for paging and stale-response cases. Run npm run check, npm run build, and Raycast lint; update milestone and validation notes. Report mocked checks separately from real-server/native checks.

## Code map

| Area                                               | Files                                                      |
| -------------------------------------------------- | ---------------------------------------------------------- |
| Command registration / preferences                 | `package.json`                                             |
| Main entry / connection boundary                   | `src/music.tsx`, `src/runtime.ts`                          |
| Shared quick-command path                          | `src/quick-command.ts`, three thin entry points            |
| UI-independent types and policies                  | `src/domain/model.ts`, `src/domain/policy.ts`              |
| API contract                                       | `src/services/port.ts`                                     |
| Persisted output selection                         | `src/services/controller.ts`, runtime LocalStorage adapter |
| Demo fixture / behavior                            | `src/services/demo-data.ts`, `src/services/demo.ts`        |
| HTTP request primitive                             | `src/services/http-client.ts`                              |
| Shared UI state / mutation feedback                | `src/ui/session.tsx`                                       |
| Dropdown, search, list/grid, collection navigation | `src/ui/music-browser.tsx`                                 |
| Contextual and player actions                      | `src/ui/item-actions.tsx`, `src/ui/player-actions.tsx`     |
| Queue inspection                                   | `src/ui/queue-view.tsx`                                    |
| Central shortcut map                               | `src/ui/shortcuts.ts`                                      |
| Automated invariant checks                         | `tests/domain.test.ts`, `tests/http-client.test.ts`        |

## Preserve these decisions

- Active output is explicit and persistent. Row highlight alone never changes it. Volume on a player row targets that row; transport and track actions target active output.
- Native List for All/Tracks, List+Detail for Players, Grid for Artists/Albums.
- Enter selects a player, plays a track now, or browses an artist/album.
- Play Next and Add to Queue do not interrupt current playback. Repeat cycles Off/Track/Queue.
- Sendspin support means controlling existing server endpoints/groups, not implementing a receiver in Raycast.
- This source has no credentials and no live server fixture yet. Fake test tokens are not connection settings.

## Known unfinished areas

The live adapter exists and Live Mode is the default, but it has not been exercised against the user's server. Search UI consumes only the first page. Group editor, authenticated artwork proxying, richer now-playing details, exact volume, seek, advanced queue actions, and event synchronization are planned. Demo shuffle/repeat only update state; they do not simulate audio timing. Demo active-player selection persists, but demo queues reset on reopen.

The `MusicService` interface deliberately covers the implemented preview slice. Extend it with paging for collections/queues, capability-rich grouping and event subscriptions in the corresponding milestones. Do not squeeze all future operations into an untyped string-command escape hatch.

WSL Linux packages/runtime are installed locally. `.tools` is ignored and can be regenerated. A native Windows/macOS Raycast import is still required to prove UI/keyboard behavior. Avoid mixing host and WSL dependencies in the same node_modules directory.
