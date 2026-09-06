# API research and implementation boundaries

Reviewed 2026-09-05. Primary-source references were supplemented by sanitized read-only checks against Music Assistant 2.10.2, schema 65. No credential, user identity, player name, or media name is stored in this repository.

## Raycast

- [Manifest](https://developers.raycast.com/information/manifest): use command `subtitle` for Audio Assistant, explanatory `description` text, keywords, and `platforms: ["macOS", "Windows"]`. The user's concern concerns subtitles rather than the separate description field.
- [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store): review naming, loading states, icons and metadata before release. Do not infer that an existing extension is approved evidence for every design choice.
- [List](https://developers.raycast.com/api-reference/user-interface/list), [Grid](https://developers.raycast.com/api-reference/user-interface/grid), [Actions](https://developers.raycast.com/api-reference/user-interface/action), [Action Panel](https://developers.raycast.com/api-reference/user-interface/action-panel), [Keyboard](https://developers.raycast.com/api-reference/keyboard): native search dropdowns, sectioned lists, inline detail panes, grid collections, contextual actions and shortcuts.
- [Menu-bar commands](https://developers.raycast.com/api-reference/menu-bar-commands): not a cross-platform choice and outside this product's scope.
- Installed/pinned `@raycast/api` **2.2.0** declares Node **>=22.22.2**. Its installed TypeScript declarations compile the foundation. WSL's original Node 20.19.2 was too old, so an ignored local Linux runtime was installed.

Raycast is not a free-form HTML music player. A view uses List, Grid or Detail; compose the experience with native navigation, detail panes, accessories and actions. Do not promise an arbitrary always-visible bottom playback toolbar or draggable web volume slider without a supported API.

## Reference extensions

- [Jellyamp PR #26549](https://github.com/raycast/extensions/pull/26549), inspected through the GitHub API, title `Add jellyamp extension`, closed; head SHA `5ffa39d69ca48cb3e86bf907a699b9af2a0036bf`.
- Local `../jellyamp-release/src/search-music.tsx`: typed All/Tracks/Albums/Artists dropdown and contextual Enter/actions. The reference manifest declares both OSes. Borrow the navigation idea; Music Assistant targets remote players rather than Jellyamp's OS media-player launching.
- [Music Assistant Controls Store page](https://www.raycast.com/yoerivd/music-assistant-controls) and [source manifest](https://github.com/raycast/extensions/blob/main/extensions/music-assistant-controls/package.json): current source already lists a library hub and group management, alongside many standalone commands. Audio Assistant's distinction is the cohesive four-command scope and specified Music workflow, not a claim that no library controls exist anywhere.

No implementation code or branding was copied from these extensions.

## Music Assistant sources

Source snapshots identified during this pass:

- Frontend `main`: `4864bc46559f6eb29936fc8ae963f693dfc6932b`.
- Server `dev`: `52d52ee8d6bff777b7502047e4dafba91b8adbb6` (API schema 67, minimum schema 28 in this snapshot).
- [Frontend API client at snapshot](https://github.com/music-assistant/frontend/blob/4864bc46559f6eb29936fc8ae963f693dfc6932b/src/plugins/api/index.ts).
- [Server HTTP controller at snapshot](https://github.com/music-assistant/server/blob/52d52ee8d6bff777b7502047e4dafba91b8adbb6/music_assistant/controllers/webserver/controller.py).
- [Music Assistant models](https://github.com/music-assistant/models): verify installed-schema enums and shapes when implementing decoders.

The M1 sanitized wire fixtures follow frontend `4864bc46559f6eb29936fc8ae963f693dfc6932b`, server `52d52ee8d6bff777b7502047e4dafba91b8adbb6`, and models `290fb0beb611d83faeed7665099093662b343871`. The adapter intentionally decodes a smaller stable subset. The user's running server reports Music Assistant 2.10.2 and schema 65.

Inspect a target server's `/api-docs/commands.json`, `/api-docs/schemas.json`, or `/api-docs/openapi.json` when supported. Development snapshots evolve faster than installed releases. No minimum supported Music Assistant version has yet been established.

Media images expose `type`, `path`, `provider`, `remotely_accessible`, and—on schema 31 or newer—an opaque `proxy_id`. Directly accessible HTTP(S) paths can be rendered as-is. Internal album and track images use `<base-url>/imageproxy/<proxy_id>?size=512`; the opaque ID is URL-encoded and the configured base path is preserved. The user's schema-65 server returned JPEG 200 responses from this canonical endpoint without authentication, so artwork URLs never contain the access token. See the official [frontend media image model](https://github.com/music-assistant/frontend/blob/main/src/plugins/api/interfaces.ts) and [server web controller](https://github.com/music-assistant/server/blob/dev/music_assistant/controllers/webserver/controller.py).

## Transport

HTTP: POST to `<base-url>/api` with `Authorization: Bearer <token>` and JSON `{ "message_id": "unique-id", "command": "players/all", "args": {} }`. The current server controller serializes the **raw command result**, including a raw array or null. Do not read `.result` as if this were a WebSocket message. Authentication/permission errors use HTTP status codes. Successful mutations may serialize null.

The foundation's `HttpCommandClient` accepts an injected fetch, returns `unknown`, preserves base paths, rejects embedded credentials/query/fragment URLs, forbids redirects, applies a timeout, and does not echo server error bodies or replay failed requests. It is deliberately not a whole Music Assistant client. Add decoders, structured error codes and server setup/schema detection in M1. Test cancellation and timeout with injected transport behavior. Do not turn transient auth/transport errors into silent demo fallback.

WebSocket: server info arrives on connection; the official client sends `auth` with `{ token }`, correlates `message_id` results, and processes separate event messages. Reconnection must wait for the new handshake and authentication. Implement partial results, connection loss rejection, pending-request cleanup and reauthentication before using WebSocket for the long-lived Music view. HTTP is sufficient for the initial live slice and short no-view commands.

## Candidate command mapping

These names/arguments were inspected in the official frontend. Confirm against the running server before enabling them; do not simply copy this table into unchecked calls.

| Domain operation    | Candidate Music Assistant command / arguments                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Players             | `players/all`; `players/get` with `player_id`, optionally `raise_unavailable`                                            |
| Queues              | `player_queues/all`; `player_queues/items` with `queue_id`, `limit`, `offset`                                            |
| Global media search | `music/search` with `search_query`, `media_types`, `limit`, optional `providers`                                         |
| Library browse      | `music/tracks/library_items`, `music/artists/library_items`, `music/albums/library_items`; verify pagination/filter args |
| Play/enqueue media  | `player_queues/play_media` with resolved `queue_id`, `media`, explicit `option`                                          |
| Repeat              | `player_queues/repeat` with `queue_id`, `repeat_mode` (`off`, `one`, `all`; verify models)                               |
| Shuffle             | `player_queues/shuffle` with `queue_id`, `shuffle_enabled`                                                               |
| Volume              | `players/cmd/volume_set` via official `playerCommand` helper; `player_id`, `volume_level`                                |
| Mute                | `players/cmd/volume_mute`; `player_id`, `muted`                                                                          |
| Transport           | Verify current `players/cmd/play_pause`, `next`, `previous` vs queue commands, including source support                  |
| Queue edit          | `player_queues/play_index`, `move_item`, `delete_item`, `clear`; verify arguments and ID semantics                       |
| Group membership    | Official `playerCommand(..., "set_members", ...)`, `group`, `ungroup`; verify prefix and feature gates                   |
| Group creation      | `players/create_group_player` with `provider`, `name`, `members`, `dynamic`                                              |

In particular verify `playerCommand`'s generated path and each target server's decorators. Queue options should map `play-now` → `play`, `play-next` → `next`, `add` → `add` only after enum/behavior confirmation. Do not use `replace` for Enter on a track. Album expansion, playback start position and queue behavior require live integration fixtures.

## Identity, capability and state rules

The official frontend's `playMedia` uses the active player's `active_source` when it identifies a known queue; otherwise it falls back to the player's ID. Grouping and non-Music-Assistant sources complicate this. Build one tested resolver, including grouped children and unsupported foreign sources; do not scatter `queue_id = player.id` throughout views.

Media identity includes provider/item ID and canonical URI. Queue-entry identity is independent. Parse server capability values, not booleans inferred from provider display names. A single `grouping` flag in demo data is not sufficient to permit live group operations. Group/provider compatibility and user permissions need separate modeling.

Store the saved target separately from current server playback state. Server playback, volume, grouping and queues are authoritative and can change from other clients at any time. Refresh after mutations and reconnects. Never optimistically claim that audio is playing before the server accepts the request.
