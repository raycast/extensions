# Development guide

Audio Assistant is a remote for an existing Music Assistant server, implemented with Raycast's shared Windows/macOS APIs. This guide records the product decisions and implementation contract. See [Status and validation](STATUS.md) for verified behavior, limitations, and remaining work; see the root [README](../README.md) for setup and everyday use. Git history holds the superseded plans and implementation diary.

## Local development

Work in WSL at `/mnt/c/Users/Opkelde/Projects/AudioAssistant`. From a Windows terminal, enter `wsl.exe`. Use Node >=22.22.2 (`.nvmrc`); do not share `node_modules` between Linux and Windows.

```sh
cd /mnt/c/Users/Opkelde/Projects/AudioAssistant
# Activate the existing ignored Linux runtime, if installed:
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
npm ci
npm run check
npm run build
```

`check` runs TypeScript, tests, ESLint, and Prettier. `build` bundles all seven commands. Run both after substantive code changes; use formatting and link checks for documentation-only changes. A WSL build can report that Raycast is not running: it proves bundling, not native import or keyboard behavior. Use a separate host dependency installation for native `npm run dev`.

Keep feature changes in separate commits so they can be reverted independently. Update [STATUS.md](STATUS.md) when behavior, limitations, or validation evidence changes. Preserve user changes and avoid accumulating separate handoff, milestone, and roadmap files.

## Product contract

Exactly seven top-level commands: **Music**, **Play / Pause**, **Next Track**, **Previous Track**, **Volume Up**, **Volume Down**, and **Toggle Mute**, each with the subtitle **Audio Assistant**. Richer controls belong inside Music. No menu-bar command, AppleScript, shell playback, local receiver, or extra root dropdown is part of the current product.

| Root view | Layout and behavior                                                                                                                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All       | Default sectioned List: Active Player, other available players, artists, tracks, then albums. Empty-query discovery previews at most five artists; typed search does not use that artist cap. Individual outputs precede group outputs. |
| Favorites | Native List of favorite Tracks, Artists, then Albums; search stays within server favorites and all three sources paginate independently.                                                                                                |
| Players   | List with details and sections for Available Players, Group Players, and Offline Players. Enter on an available output selects it; Enter on a compatible group candidate adds it to the active output.                                  |
| Tracks    | Paged library List with artist, album, duration, and artwork where available. Enter plays immediately.                                                                                                                                  |
| Artists   | Four-column Grid. Enter opens one searchable List with Albums followed by Tracks, without a nested dropdown.                                                                                                                            |
| Albums    | Four-column Grid. Enter opens tracks in disc/track order; ties and unknown positions retain their original relative order.                                                                                                              |

Keep query text when switching root views; clear it when opening a collection and restore the parent on Back. Root Artists/Albums stay grids. Track actions can browse decoded artist/album references or copy a media URI. Artwork uses native fallbacks when missing.

**All starts with the saved available output.** The Active Player section reads fresh session state and removes that player from the ordinary Players section. The first All list waits for initial output resolution, allowing native first-row selection without controlled focus. Typed searches include the active row only when its name/provider matches. Missing/offline saved output or output-resolution failure shows a recovery row; no saved output preserves explicit selection. Later refreshes do not remount the list.

**Highlight and active output are different.** Enter explicitly selects and persists an available output, scoped to server and authenticated user; demo state is separate. Never silently choose another room when the saved output is missing, removed, or offline. Playback and track actions target the saved output; volume/mute target the highlighted player when applicable, otherwise the active output. Missing output produces a toast and a Choose Active Player recovery action.

Play Now uses the server's `play` option, not queue replacement. Play Next uses `next`; append uses `add`. Verify real-server behavior separately from demo simulation. Queue entries have their own IDs: repeated songs are distinct entries. Repeat cycles Off → Track → Queue → Off (`off`, `one`, `all` on the wire).

## Keyboard and native UI rules

`Primary` is Cmd on macOS and Ctrl on Windows. Keep native selection/focus handling in List/Grid and one contextual action panel per row. Preserve the fixes from `acb5748`: do not reintroduce controlled selection that steals search focus, duplicate root action panels, or search resets after ordinary playback mutations. Do not assign application shortcuts to text editing or the native action-panel keys.

| Action                        | Default Shortcut                    |
| ----------------------------- | ----------------------------------- |
| Primary row action            | Enter                               |
| Native action panel           | Primary+K                           |
| Favorite Playing Track        | Alt+F                               |
| Favorite Selected Track       | Alt+Shift+F                         |
| Play/Pause                    | Alt+Enter                           |
| Next / Previous               | Alt+. / Alt+,                       |
| Play Next                     | Primary+Alt+N                       |
| Add to Queue                  | Alt+A                               |
| Browse Artist / Album         | Primary+Space / Primary+Shift+Space |
| Volume up / down, five points | Alt+= / Alt+-                       |
| Mute / Unmute Player          | Alt+M                               |
| Shuffle                       | Alt+S                               |
| Repeat                        | Alt+R                               |
| Show Queue                    | Alt+Q                               |
| Now Playing                   | Alt+I                               |
| Refresh                       | Primary+R                           |
| Keyboard Shortcuts            | Primary+Shift+. (non-configurable)  |
| Extension Preferences         | Primary+. (non-configurable)        |

The executable default map is `src/ui/shortcuts.ts`; preserve its existing values exactly. **Music → Keyboard Shortcuts** is a native searchable List grouped into Playback, Volume, Queue, and Navigation. Enter edits one action in a Form (modifier, optional additional modifier, key), with a full shortcut preview, validation, Save/Cancel, and reset controls. Primary+Shift+. opens it from Music routes, including empty/setup states. Primary+. continues opening native Extension Preferences, which contains only connection settings and Demo Mode; the server URL description points to the editor. Exactly seven top-level commands remain.

`src/services/shortcut-settings.ts` owns versioned, validated shortcut-only LocalStorage data under `music-shortcuts-v1`. `src/ui/use-shortcuts.ts` adapts the shared store to React with `useSyncExternalStore`. Music waits for initial loading before rendering action bindings. Successful persistence publishes a new snapshot to root and pushed routes without replacing the music session or refreshing playback. Failed writes leave the current snapshot unchanged. Unreadable saved data produces an explicit error, uses defaults for that launch, and is not automatically overwritten; reopening retries, or confirmed Restore All Defaults recovers.

On first use, import only known legacy shortcut fields returned by `getPreferenceValues`; never persist the preference object, server URL, or password token. Raycast does not document retention of removed manifest preference values, so migration is best effort, with an explicit first-run review notice approved for this release. Users may need to reapply missing customizations. Mark Shortcuts Reviewed persists acknowledgment; resets cannot resurrect legacy overrides. Shortcuts are extension-local UI settings shared between live/demo modes, separate from server/user-scoped playback output state.

Validate keys/modifiers, duplicate physical modifiers on either platform, Shift-only typing/selection combinations, native action-panel and text-editing keys, both fixed settings shortcuts, and collisions with other Music action shortcuts on either platform. Preserve imported effective legacy bindings instead of silently rewriting them to satisfy new validation. New edits must pass validation. Restoring one default also checks collisions; restoring all defaults confirms replacement. Native global command hotkeys remain Raycast-managed. Hide capability-dependent actions when unsupported; Next/Previous also reject unsupported calls at the service boundary. Native keyboard/layout checks remain separate from automated tests.

## Architecture

| Area                                          | Main files                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Commands, preferences, runtime                | `package.json`, `src/music.tsx`, `src/runtime.ts`, `src/quick-command.ts`                                                             |
| Domain and target/group policy                | `src/domain/model.ts`, `policy.ts`, `grouping.ts`                                                                                     |
| Typed service and saved selection             | `src/services/port.ts`, `controller.ts`                                                                                               |
| HTTP, decoding, live implementation           | `src/services/http-client.ts`, `wire.ts`, `live.ts`                                                                                   |
| Demo and paged search                         | `src/services/demo.ts`, `demo-data.ts`, `search-pager.ts`                                                                             |
| Shared navigation state                       | `src/services/session-bridge.ts`, `src/ui/session.tsx`                                                                                |
| Browser, players, actions, queue, now playing | `src/ui/music-browser.tsx`, `player-sections.tsx`, `item-actions.tsx`, `player-actions.tsx`, `queue-view.tsx`, `now-playing-view.tsx` |
| Shortcut settings and editor                  | `src/services/shortcut-settings.ts`, `src/ui/use-shortcuts.ts`, `src/ui/shortcut-settings-view.tsx`, `src/ui/shortcut-keys.ts`        |
| Automated tests and sanitized fixtures        | `tests/`                                                                                                                              |
| Read-only server smoke test                   | `scripts/live-smoke.ts`                                                                                                               |

React consumes domain models through `MusicService`. Decode server data from `unknown` inside services; do not cast unchecked JSON into domain types or add raw command calls to views.

Raycast renders pushed routes outside the parent's React context. `SessionRoute` bridges them to the root-owned session using `SessionBridge` and `useSyncExternalStore`. They share the runtime, selected output, mutation lock, and demo queues. Only the root owns disposal; do not create independent sessions for artist/album/queue/now-playing routes.

Favorites is the second of six dropdown views, after All. `MusicService.search({ view: "favorites", ... })` routes to `src/services/favorite-search.ts` and the live library adapter. It sends `favorite: true`, `summary: false`, `search`, `limit`, and `offset` to each media type's `library_items` endpoint; it never falls back to unrestricted `music/search`. Full items must explicitly report `favorite: true` before strict media decoding. This also rejects ignored/unsupported filters instead of leaking non-favorites. No user impersonation argument is sent: queries use the authenticated request context.

The opaque Favorites cursor tracks each source's offset and previous-page identity digest; exhausted or failed sources are omitted. Repeated pages fail visibly. Partial failures retain successful results and accumulated warnings; failed sources restart only on explicit Refresh or a fresh search. The UI distinguishes no favorites, no search matches, and query failures. Favorites has a separate explicit-refresh revision, so membership changes can be fetched without restarting search after ordinary playback mutations. Parent Favorites query/view state survives collection navigation. The optional domain favorite flag is decoded only from booleans; demo fixtures mark a deterministic subset. Track favorites can be toggled with Alt+F for the active output’s current track and Alt+Shift+F for the highlighted track; both are configurable. Artist/album favorite editing, playlists, and radio remain outside this implementation.

Search uses cancellable service cursors with identity deduplication and stale-response rejection. Empty-query All advances tracks and albums independently; successful sources remain usable when another fails. Collections cache full browse results and filter locally until refresh. Current state refreshes on launch, explicit Refresh, and successful mutations; there is no event subscription or periodic polling yet.

Resolve player → effective queue from server source/group state. Never assume a player ID equals its queue ID. Refuse queue actions for unsupported foreign sources. Re-read relevant target state before mutations; volume steps read the latest reported volume. The shared UI serializes mutations. Never automatically retry an ambiguous playback/queue mutation; refresh actual state before another attempt. Do not report success before acknowledgment and reconciliation.

## Group playback

Use reported `set_members`, `can_group_with`, `group_members`, `static_group_members`, `synced_to`, and `active_group` data. Provider names or Sendspin branding alone do not establish compatibility.

The Group Players section shows available compatible endpoints for the selected primary. Unsupported outputs show “Current output does not support synced group playback”; missing selection or no matches has its own explanation. Linked members offer removal. Offline outputs stay in the last Players section and are excluded from All, including typed searches.

Before an edit, re-read players, resolve the group leader, reject follower leadership changes, and protect static members. Use additive/removal member arrays to preserve unrelated members and the saved primary. Confirm disruptive joins involving an already playing/grouped member. Refetch and verify membership after acknowledgment; subsequent playback resolves queue ownership again. Permanent group creation is not implemented. Existing Sendspin endpoints must already be connected to Music Assistant; Audio Assistant is not a receiver.

## Protocol and compatibility

Read-only checks on September 5–6, 2026 used **Music Assistant 2.10.2, schema 65**. This is the verified reference, not a claimed minimum supported version. Before extending version-sensitive operations, inspect the target server's `/api-docs/commands.json`, `/api-docs/schemas.json`, or `/api-docs/openapi.json` where available.

HTTP commands POST to `<base-url>/api` with bearer authentication and `{ message_id, command, args }`. HTTP returns the raw command result (including arrays or null), not a WebSocket `.result` envelope. The client preserves reverse-proxy base paths, rejects embedded credentials/query/fragment in configured URLs, forbids redirects, times out requests, sanitizes errors, and never replays requests automatically.

Tokens belong only in Raycast's password preference. Exclude them from logs, URLs, fixtures, documentation, and cache keys. The read-only test harness accepts connection settings through environment variables and omits identities/media names from output. Do not silently fall back to demo after a live connection failure.

| Implemented operation     | Command / essential arguments                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Connection identity       | `info`, `auth/me`                                                                                               |
| Players / queue summaries | `players/all` (`return_unavailable: true`), `player_queues/all`                                                 |
| Queue entries             | `player_queues/items` (`queue_id`, `limit`, `offset`)                                                           |
| Library pages             | `music/{tracks,artists,albums}/library_items` (`limit`, `offset`, `search`)                                     |
| Typed search              | `music/search` (`search_query`, `media_types`, `limit`); no unsupported offset                                  |
| Artist collections        | `music/artists/artist_tracks`, `music/artists/artist_albums` (`item_id`, `provider_instance_id_or_domain`)      |
| Album tracks              | `music/albums/album_tracks` (same identity arguments, `in_library_only: false`)                                 |
| Track favorite lookup     | `music/tracks/get` (`item_id`, `provider_instance_id_or_domain`, `allow_update_metadata: false`)                |
| Track favorite add/remove | `music/favorites/add_item` (`item` URI); `music/favorites/remove_item` (`media_type: track`, `library_item_id`) |
| Current track lookup      | `player_queues/get` (`queue_id` resolved from active output)                                                    |
| Play / enqueue            | `player_queues/play_media` (`queue_id`, `media`, `option`)                                                      |
| Transport                 | `players/cmd/play_pause`, `next`, `previous` (`player_id`)                                                      |
| Volume / mute             | `players/cmd/volume_set` (`player_id`, `volume_level`), `volume_mute` (`player_id`, `muted`)                    |
| Repeat / shuffle          | `player_queues/repeat` (`queue_id`, `repeat_mode`), `shuffle` (`queue_id`, `shuffle_enabled`)                   |
| Remove queue entry        | `player_queues/delete_item` (`queue_id`, `item_id_or_index`)                                                    |
| Group membership          | `players/cmd/set_members` (`target_player`, `player_ids_to_add` or `player_ids_to_remove`)                      |

Queue loading requests batches of 200 until the reported item count is reached. It rejects overlapping/stalled results and stops incomplete loads at 10,000 entries with an explicit error. This is complete-result loading within that guard, not incremental queue UI pagination.

Media identities include provider, item ID, and canonical URI. Optional related artists/albums may be full objects or ItemMappings; malformed references omit navigation without dropping a valid track. Internal artwork uses the encoded opaque `proxy_id` at `<base-url>/imageproxy/<proxy_id>?size=512`, preserving proxy base paths. Direct remotely accessible HTTP(S) artwork remains unchanged. The schema-65 server returned unauthenticated JPEGs from the canonical proxy; never put a token in artwork URLs.

Track favorite mutations use `MusicService.toggleTrackFavorite` / `toggleCurrentTrackFavorite`. The playing variant resolves the active player’s effective queue afresh and reads `player_queues/get.current_item.media_item`; idle players, foreign sources, and non-track/synthetic queue items fail clearly. Both variants use `music/tracks/get` with metadata updates disabled to obtain current favorite state. Add uses `music/favorites/add_item` with the canonical URI; remove requires a resolved library identity and uses `music/favorites/remove_item` with media type `track` and library item ID. Re-read the track to verify before showing success. After an ambiguous write error, read state once without replaying the write and report failure. These commands require `library.write` in addition to the read permissions.

Favorite actions share the session mutation lock and publish a Favorites-only revision after either outcome, so root/pushed Favorites views reconcile without resetting unrelated searches. Toasts distinguish Added / Removed and retain Demo labeling. Existing shortcut storage gains the two missing definitions without resetting previous overrides. If an old custom shortcut conflicts with a new default, the new action remains available through the action panel but its conflicting key is withheld until edited in Keyboard Shortcuts.

### Favorites compatibility check, September 7, 2026

The running server's public `/api-docs/openapi.json` identifies version **2.10.2**. Its `/api-docs/commands.json` confirms the boolean `favorite` and `summary` parameters plus `search`, `limit`, and `offset` for tracks, artists, and albums; each command returns an array and requires `library.read`. `/api-docs/schemas.json` includes a boolean `favorite` on all three media models. A sanitized contract extract is retained in `tests/fixtures/favorites-command-contract.json`. This is public-schema verification; no authenticated favorites response or current schema-number handshake was available in this session. The existing schema-65 reference comes from the earlier authenticated checks. `scripts/live-smoke.ts` now includes a read-only Favorites probe for the next authenticated validation.

### Authoritative references

- Raycast: [manifest](https://developers.raycast.com/information/manifest), [List](https://developers.raycast.com/api-reference/user-interface/list), [Grid](https://developers.raycast.com/api-reference/user-interface/grid), [actions](https://developers.raycast.com/api-reference/user-interface/action), [action panel](https://developers.raycast.com/api-reference/user-interface/action-panel), [keyboard](https://developers.raycast.com/api-reference/keyboard), [Form](https://developers.raycast.com/api-reference/user-interface/form), [preferences](https://developers.raycast.com/api-reference/preferences), [storage](https://developers.raycast.com/api-reference/storage), [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store).
- The pinned Raycast API is **2.2.0**. Use installed declarations when checking the current implementation; native UI is List/Grid/Detail, not arbitrary HTML.
- Music Assistant [2.10.2 player controller](https://github.com/music-assistant/server/blob/2.10.2/music_assistant/controllers/players/controller.py) verifies membership feature gates, expanded compatibility IDs, and group redirection.
- Fixture source snapshots: [frontend API client `4864bc4`](https://github.com/music-assistant/frontend/blob/4864bc46559f6eb29936fc8ae963f693dfc6932b/src/plugins/api/index.ts), [server HTTP controller `52d52ee`](https://github.com/music-assistant/server/blob/52d52ee8d6bff777b7502047e4dafba91b8adbb6/music_assistant/controllers/webserver/controller.py), [models `290fb0b`](https://github.com/music-assistant/models/tree/290fb0beb611d83faeed7665099093662b343871). That server development snapshot uses schema 67; it is not the installed schema-65 server.
- Design references: [Jellyamp PR #26549](https://github.com/raycast/extensions/pull/26549) for native dropdown navigation and [Music Assistant Controls](https://www.raycast.com/yoerivd/music-assistant-controls) for context. No implementation code or branding was copied; Audio Assistant's distinction is its cohesive Music workspace.

WebSocket events are future work. A future client must handle initial server info, token authentication, correlated/partial results, pending-request rejection, cleanup, and reauthentication on reconnect before becoming authoritative for the UI.

## Store submission

Use `npm run publish`, Raycast's official publisher, to update the existing [PR #30841](https://github.com/raycast/extensions/pull/30841) when publication is requested. Do not manually create a replacement PR. The publisher uses the user's GitHub authentication from `~/.config/raycast/config.json` and updates the PR branch automatically. Never commit generated checkouts or credentials.

The extension icon is `assets/icon.png`. Store screenshots are the five ordered 2000×1250 PNGs `metadata/audio-assistant-1.png` through `-5.png`; original user captures are retained in `media/`. Keep screenshots out of runtime assets. Recheck the official Store requirements when preparing a future submission.
