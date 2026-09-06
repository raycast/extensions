# Product specification

## Product boundary

Audio Assistant is a keyboard-first remote for an existing Music Assistant server. The primary experience is a single Raycast Music command with native navigation and actions. Playback happens on Music Assistant players, including existing Sendspin endpoints. Running a Sendspin client/audio receiver inside Raycast is out of scope.

Exactly three additional commands are allowed: Play/Pause, Next Track, Previous Track. No standalone volume, setup, groups, current-track, or menu-bar commands. Setup and all richer controls belong inside Music or extension preferences.

## Views

| Dropdown              | Layout                       | Contents and Enter behavior                                                                                                                                                                                                          |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All (initial default) | Compact sectioned List       | Players → up to five artists → tracks → albums. Enter selects a player, immediately plays a track, or browses an artist/album.                                                                                                       |
| Players               | List with inline detail pane | All registered players, including clearly marked offline entries. Details show provider, availability, current media, volume, source, leader/members and capabilities. Enter sets active output. Group management actions stay here. |
| Tracks                | Compact List                 | Paginated tracks with artist, album, duration and optional art. Enter plays now.                                                                                                                                                     |
| Artists               | Four-column Grid             | Portraits or a person fallback. Enter opens an artist collection with albums and tracks.                                                                                                                                             |
| Albums                | Four-column Grid             | Covers or a disc fallback; artist subtitle. Enter opens album tracks in disc/track order.                                                                                                                                            |

The dropdown stays at the right of the search bar, as in Jellyamp. Default to All on each fresh command launch. Keep query text when changing dropdown views; clear it on opening a collection, restore it on Back. Preserve a stable selected item when refreshes arrive. Every data view needs loading, empty, retry/error, and offline states. Do not render stale rows from a previous view under a new view label.

Empty-query All starts with individual players (physical/individual endpoints first, group outputs after them), then a bounded artist preview, then tracks. Album results follow tracks so they do not displace the requested order. Search matches player names locally and asks Music Assistant for artists/tracks/albums across configured providers. The five-artist cap applies only to empty-query discovery, never typed search. Track browsing must paginate the library; "all tracks" does not mean fetching the entire library into memory on launch.

Do not add a sixth root dropdown in v1. Playlists may appear as an additional result type after the core milestone if supported cleanly; they are not required for the foundation. Repeat Queue covers playback originating from a playlist as well as a hand-built queue.

## Active output and now playing

- **Highlighted player** is the selected List row. **Active output** is the saved playback target. Highlighting alone never redirects playback.
- Enter on an available player persists its ID and updates the active badge. The saved target is the default on subsequent launches and for quick commands. No separate contradictory default setting.
- Persist selection by canonical server identity plus authenticated user identity. Demo has its own scope. Changing servers/accounts must never reuse a previous target by accident.
- No active output: Play Now/Next/Add and transport show a failure toast: "Select a player and press Enter before playing music." Include a Choose Player recovery action in the completed version.
- Removed/offline output: keep the saved choice identifiable, show unavailable, and require explicit reselection. Never auto-switch to another room.
- Show active player, actual playback state, track/artist, repeat/shuffle, and available volume in the Music workspace. Use native navigation title/accessories and a Now Playing detail opened from actions. Keep players first; do not insert a fake song row above them.
- The foundation shows the player/current track in its title. Rich Now Playing detail and source/event synchronization are milestone work.

## Actions and shortcuts

`Primary` means Cmd on macOS, Ctrl on Windows. Use the native action panel shortcut (Cmd+K / Ctrl+K); do not override it. Enter is always the first contextual action, not a second competing shortcut.

| Context         | Action            | Shortcut                         | Target                                                                                   |
| --------------- | ----------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| Player          | Set Active Player | Enter                            | Highlighted player                                                                       |
| Track           | Play Now          | Enter                            | Saved active output                                                                      |
| Artist/album    | Browse            | Enter                            | Selected collection                                                                      |
| Track           | Play Next         | Primary+Shift+N                  | Active queue; insert directly after current, keep current playing                        |
| Track           | Add to Queue      | Primary+Shift+A                  | Active queue; append without starting playback                                           |
| All views       | Play/Pause        | Primary+P                        | Active output                                                                            |
| All views       | Next / Previous   | Primary+Shift+Right / Left       | Active output/queue as supported                                                         |
| Player or music | Volume Up / Down  | **Ctrl+= / Ctrl+- on both OSes** | Highlighted player when on a player row; otherwise active output; ±5 points, clamp 0–100 |
| Player or music | Mute / Unmute     | Primary+Shift+M                  | Same volume target                                                                       |
| All views       | Cycle Repeat      | Primary+Shift+R                  | Active queue: Off → Track → Queue → Off                                                  |
| All views       | Toggle Shuffle    | Primary+Shift+S                  | Active queue                                                                             |
| All views       | Show Queue        | Primary+Shift+Q                  | Active queue; nested view                                                                |
| All views       | Refresh           | Primary+R                        | Current data and player/queue state                                                      |

Actions must name their target in section headings. Capability-dependent actions are hidden when unsupported, with the reason visible in player details. An offline row remains selectable for inspection but Enter returns an availability toast.

Additional implementation actions: Set Exact Volume (0–100 Form), Now Playing, Seek ±10 seconds when supported, Browse Track Artist/Album, Copy Media URI, Open Music Assistant, Choose Active Player, queue Play Entry/Move Next/Move Up/Move Down/Remove/Clear, and Players-only Manage Group / Leave Group. Keep rare actions in submenus without allocating a shortcut to everything. Confirm Clear Queue and disruptive group changes with a concrete target/member summary. Do not request confirmation for immediate track playback or ordinary volume changes.

Play Now policy: play the chosen track immediately while preserving the queue, using the server's verified `play` queue option. Replacement must be a separate explicitly named action if ever added. Demo models insert-after-current-and-jump; integration tests must establish actual server semantics rather than assuming demo ordering is a wire guarantee.

Queue operations address **queue entry IDs**, not media URIs; the same song can appear more than once. Repeat Track affects automatic completion, not an explicit Next action. Repeat Queue loops the complete server queue, not just visible search results.

## Grouping / Sendspin

Players view is the control surface for grouping. Expose current leader, members, compatible targets, group volume vs individual volume, and source. Use server-reported capabilities and compatibility to decide which actions exist. Do not infer grouping support from a provider name alone.

Join, leave, membership editing and group creation are separate operations with separate capability gates. Group changes can alter queue/source ownership: refetch before the next playback mutation. Do not assume arbitrary cross-provider grouping works. Sendspin endpoints must already be connected to Music Assistant; this extension manages them through the server.

## Failure and responsiveness policy

Debounce typed search approximately 200 ms. Abort or discard stale responses. Independent list failures should not destroy usable player controls. Bound page size, deduplicate provider identity carefully, and use opaque cursors at the service boundary. Mutations wait for acknowledgment and reconcile from actual server state. Disable/serialize repeated mutations per target to avoid volume and queue races. Never replay uncertain mutations after a timeout.

Store token in a password preference, use HTTP(S) plus bearer auth, preserve reverse-proxy base paths, and do not follow credential-bearing redirects. Surface auth, permissions, unavailable player, unsupported action, timeout, and server setup failures as different recovery paths. The HTTP transport stub already covers basic messages; structured error mapping remains part of integration.
