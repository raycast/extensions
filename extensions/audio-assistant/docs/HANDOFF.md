# Next-model handoff

The extension has a live HTTP adapter and a submitted Raycast Store PR (#30819). Read-only checks against Music Assistant 2.10.2/schema 65 and user-reported playback testing are recorded separately from automated checks. Do not treat all native/cross-platform validation as complete.

## Next task

Latest user-requested slice: synced group membership is now implemented in Players (Available, Group, Offline sections); All hides offline players. See GROUP_PLAYBACK_PLAN.md. Native and audible sync checks remain pending; full group creation is outside this slice.

Read `IMPROVEMENT_ROADMAP.md`, `IMPLEMENTATION_PLAN.md`, `PRODUCT_SPEC.md`, and `VALIDATION.md`. Continue the remaining M2 work before M3. The September 6 improvement pass added paged List/Grid browsing, independent All discovery cursors, artist album grids/track lists, collection caching/cancellation, related-media actions, album ordering, and partial discovery recovery. Each feature has its own local commit. The user stopped this pass; do not assume authorization for further work or publication from this handoff.

Remaining M2 work: native scrolling/selection/Back checks, collection rendering pagination, and a verified strategy for deeper typed provider searches (the current global search contract has no cursor). Keep unsupported API parameters out of requests. Final automated status: 28 tests and check/build passed in WSL; native validation remains pending.

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
- Source and fixtures contain no live credentials. Tokens belong only in the password preference; fake test tokens are not connection settings.

## Known unfinished areas

Live Mode is the default. Empty-query library views and All discovery paginate; typed global provider search remains bounded. Collections cache full API results and offer artist album grids and track lists, but do not yet paginate rendering. Group editing, richer Now Playing details, exact volume, seek, advanced queue actions, and event synchronization remain planned. Demo queues reset on reopen, and demo repeat/shuffle do not simulate audio timing.

Extend the typed MusicService boundary for queue paging, grouping and subscriptions in their milestones. Never add an untyped command escape hatch in React. Recent changes have not been pushed to GitHub or added to the submitted Store PR.

WSL Linux packages/runtime are installed locally. `.tools` is ignored and can be regenerated. A native Windows/macOS Raycast import is still required to prove UI/keyboard behavior. Avoid mixing host and WSL dependencies in the same node_modules directory.
