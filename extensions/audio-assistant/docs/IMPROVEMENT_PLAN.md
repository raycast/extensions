# Music improvements: active player and Favorites

Date: September 7, 2026
Status: Both improvements implemented September 7, 2026. Automated tests and production builds passed; authenticated Favorites results and native keyboard/focus checks remain outstanding. See STATUS.md for current validation evidence.

This plan was explicitly requested as a separate document. The existing development guide and status record remain authoritative for shipped behavior. Implement the two improvements in separate commits after approval; preserve all default and custom shortcut behavior and exactly seven top-level commands.

## 1. Active Player at the top of All

### Outcome

When someone opens Music with an available saved output, the first selectable row in All is that output. They can immediately use volume, mute, or playback shortcuts without navigating past another room.

The existing code already sends Play/Pause, Next, and Previous to the saved output. Volume and mute intentionally target the highlighted player when a player row is highlighted. Preserve that distinction: this change fixes the initial highlight through layout rather than changing the targeting rules.

### Proposed behavior

- Empty-query All section order: **Active Player → Players → Artists → Tracks → Albums**.
- Active Player contains exactly the saved, available output from the shared session, including a saved group output. Show its name, playback state, volume/mute status where supported, and an Active badge. Use the existing contextual player actions and shortcut bindings. Enter retains the existing Set Active Player behavior; do not give Enter a new playback meaning.
- Exclude this output from the ordinary Players section so it appears once. Keep the existing ordering of all other players and media.
- Render the active row from current session player state, not a cached search-page copy. Reuse its stable player item ID when moving between sections.
- During the initial session load, do not render another player as a temporary first selectable row before the saved output has been resolved. Once initial output resolution finishes, mount the populated All list with the active row first. Do not wait for the library search to finish to expose the resolved active player.
- Allow Raycast to select the first row naturally on a fresh launch. Do not add a continuously controlled `selectedItemId`, remount the list after routine refreshes, or reset search text. Native selection behavior is an implementation acceptance gate, not something a TypeScript test proves.
- When the user deliberately highlights another player, volume/mute continue to affect that highlighted player. Merely highlighting it must never persist a different active output.
- When Enter selects a different output, move that output into Active Player using stable IDs; subsequent refreshes must not pull the highlight away from deliberate navigation or steal search focus.
- For typed searches, show Active Player only if it matches the player search query. This keeps unrelated player rows from becoming the default action for a song search. Matching active players stay first and are still deduplicated; clearing search restores the normal section order.
- With no saved output, omit the active section and preserve explicit player selection. If the saved output is offline or removed, show a clear top status/recovery row rather than silently selecting another output. That row must not receive another player's volume/mute actions. Preserve All's exclusion of actual offline player rows and the existing Players view for recovery.
- If initial player/identity loading fails, show an explicit recovery state rather than treating the failure as “no saved output.” Do not target an arbitrary room.

### Implementation

1. Add a small, testable All-section composition helper for active output placement, deduplication, query matching, and unavailable-output states.
2. Update `src/ui/music-browser.tsx` to render the active section before ordinary results only in root All, keeping collection and other view layouts unchanged.
3. Use `src/ui/session.tsx` initial-load state, adding an explicit output-resolution state if needed to distinguish loading, failure, and a confirmed absence of a saved output. Keep the existing runtime and SessionBridge ownership.
4. Reuse row presentation and `ItemActions` / `PlayerActions`; keep queue resolution and mutation guards at the existing service/controller boundaries.

### Acceptance checks

- Saved player B becomes the first highlighted All row even when server order is A, B, C; pressing volume changes B without first navigating.
- Play/Pause still targets B; deliberately highlighting A changes only volume/mute targeting, not the saved selection or transport target.
- Active output occurs once; group output, no saved output, removed/offline output, and failed initial load behave as described.
- Slow player/identity loading and fast library loading cannot expose A as a transient default target.
- Search, clear search, player changes, repeated mutations, refresh, Back navigation, and pushed views preserve usable focus and stable selection.

## 2. Favorites view in the Music dropdown

### Outcome and scope

Add **Favorites** after All: **All, Favorites, Players, Tracks, Artists, Albums**. This is a sixth view within Music, not an eighth top-level command.

For this first implementation, Favorites means the tracks, artists, and albums marked as favorites in Music Assistant. It is not a new local favorites database or an assumption about likes in an upstream streaming provider. Browse existing favorites first; adding/removing favorites, favorite players, playlists, and radio browsing are separate follow-ups outside this request's proposed implementation.

### Proposed behavior

- Render a native List with **Tracks → Artists → Albums** sections. Tracks first supports quick playback. Display artwork, useful subtitles, and a favorite indicator.
- Keep existing actions: Enter plays a track or opens an artist/album; queue, related-music, playback, and shortcut-editor actions remain available as appropriate.
- Search only within favorites, including when text is already present before switching into the view. Do not use unrestricted provider search and then filter its first page.
- Fully paginate all three media types independently, without All's five-artist discovery cap. Deduplicate by existing media identity, preserve cancellation/stale-response protection, and stop exhausted sources.
- Keep query text on dropdown switches. Opening an artist/album clears the child query; Back restores Favorites and its parent query/results through the existing navigation flow.
- Show “No Favorites Yet” with guidance to mark items in Music Assistant, versus “No Matching Favorites” for a filtered empty result. Failed or unsupported favorite queries must show an error, not a false empty-library message.
- Preserve usable sections if another type fails, with a visible warning and explicit Refresh recovery.
- Explicit Refresh reloads favorite membership from the server. No new periodic polling is introduced. Ordinary playback/volume mutations must not clear or restart the favorites search.
- Demo uses clearly labeled, deterministic favorite fixtures and the same search/paging behavior, without touching live state.

### API verification and implementation

1. Before enabling live Favorites, inspect the running server's command/schema documentation and verify favorite filtering for each of `music/tracks/library_items`, `music/artists/library_items`, and `music/albums/library_items`. Confirm exact argument names/types, search composition, pagination, response shape, and any user/library scope. The previous verified reference was Music Assistant 2.10.2/schema 65; recheck the running version.
2. Treat a server-side favorite filter as the preferred implementation, not a verified fact about this host. Do not invent a parameter or silently substitute an ordinary library query. If unsupported, report the incompatibility and settle a bounded fallback before shipping it.
3. Extend `View` in `src/domain/model.ts` and route `view: "favorites"` through `MusicService.search`. A separate service method is unnecessary unless schema verification reveals a materially different contract.
4. Implement the live branch before generic empty-query discovery and `music/search` dispatch in `src/services/live.ts`. Maintain an opaque cursor covering tracks, artists, and albums, with separate exhaustion state per type. Reuse strict media decoding in `src/services/wire.ts`; add a validated favorite field only if the API response or UI actually requires it.
5. Extend `src/services/demo.ts`, demo fixtures, and relevant domain search helpers. Ensure demo Favorites works with both empty and typed queries.
6. Add the dropdown entry and section order in `src/ui/music-browser.tsx`. Fix explicit Refresh to invalidate the Favorites pager separately from general session mutation revisions: the existing successful root search does not automatically rerun on every session revision.
7. Reuse `SearchPager` for cancellation, deduplication, and warning accumulation. Do not let failed requests discard successful favorites or make unbounded automatic retries.

### Acceptance checks

- Empty and typed Favorites requests include the server-verified favorite filter for every type; non-favorites never leak in through generic search.
- More than one page of favorite artists, tracks, and albums loads completely, with uneven source lengths, duplicates, empty pages, malformed payloads, and partial failures covered.
- Switching views or rapidly changing the query cannot publish stale favorite results into another view.
- Refresh picks up additions/removals made in Music Assistant while ordinary playback preserves query and results.
- Favorite tracks play/enqueue through existing target and effective-queue rules. Favorite artists/albums browse normally and return to the same Favorites view on Back.
- Demo/live state is isolated; unsupported filtering and server failures are distinguishable from an empty favorites collection.

## Delivery and validation

1. Implement and validate Active Player first in a bounded commit.
2. Verify the live favorites API, then implement Favorites in a second bounded commit.
3. Run meaningful composition, service/transport, decoding, and paging tests; run `npm run check` and `npm run build` after substantive changes.
4. Separately validate fresh-launch highlight, actual shortcut targets, search focus, dropdown changes, and Back behavior in native Raycast on Windows and macOS. Use the running Music Assistant server to verify favorites and actual volume/playback targeting. Record only checks actually performed.
5. Update `docs/DEVELOPMENT.md`, `docs/STATUS.md`, README, and changelog with shipped behavior and evidence. Update screenshots if appropriate. Retire or clearly mark this requested proposal when implemented so it cannot compete with the canonical documentation.
6. Implementation, testing, separate commits, pushing, and the official publisher were subsequently authorized by the user. This document preserves the approved proposal; DEVELOPMENT.md and STATUS.md describe shipped behavior and actual validation.

## References

- Local implementation: `src/ui/music-browser.tsx`, `src/ui/player-actions.tsx`, `src/ui/item-actions.tsx`, `src/ui/session.tsx`, `src/domain/model.ts`, `src/services/port.ts`, `src/services/live.ts`, `src/services/search-pager.ts`, and `src/services/demo.ts`.
- [Music Assistant frontend API client](https://github.com/music-assistant/frontend/blob/main/src/plugins/api/index.ts): reference for investigating favorite library queries; the current main branch is not proof of the installed server contract.
- [Music Assistant library action documentation](https://www.home-assistant.io/actions/music_assistant.get_library/): documents favorite filtering at the Home Assistant integration layer; exact direct-server arguments still require the verification above.
