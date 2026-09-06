# Improvement roadmap

Work starts from `6e48059`. Each completed slice gets a separate commit; revert its commit to remove that slice. Changes stay local until a push is requested.

1. **Paged library browser:** consume service cursors in List and Grid, deduplicate overlapping pages, cancel obsolete requests, retain loaded rows on page failure, and prove race behavior with deferred-request tests.
2. **Mixed discovery paging:** independently advance tracks/albums in All while retaining the bounded artist preview and player-first order. Verify actual search API pagination support before extending typed provider search.
3. **Collection navigation:** artist album grids and track lists, related artist/album actions, stable selection and Back behavior, and ordered album tracks.
4. **Playback workspace:** accurate Now Playing details, exact volume input, fresh-state volume shortcuts, and bounded state refresh with cleanup.
5. **Queue completion:** paginated queue inspection, entry actions and confirmed clear, preserving duplicate entry identity and actual queue ownership.
6. **Player details and groups:** useful capability/source details first; only enable group mutations after live schema and compatibility verification.
7. **Release evidence:** reconcile obsolete handoff notes, preserve pending native/macOS checks, update store documentation, and recheck publishing contents.

## Validation policy

Run `npm run check` and `npm run build` for each substantive slice. Add tests for observable domain, transport, paging and race behavior. Record native UI and real-server checks separately; never infer them from a successful bundle. Do not replay timed-out mutations. Preserve the four commands and five root views.

## Progress

- Roadmap recorded before implementation.
- Paged browser implemented: List/Grid consume cursors, deduplicate media identities, reject late responses, and retain pages on errors. Stable item IDs support selection. Mixed All discovery and typed provider search still need adapter work.
- Generated publishing checkouts excluded from ESLint/Prettier in a separate tooling commit.
- All discovery now advances track/album cursors independently; exhausted types stop fetching and player/artist previews stay bounded. Contract tests verify offsets and termination.
- Artist collections now offer Albums (grid) and Tracks (list). Collection results are reused while filtering, invalidated on refresh, and requests receive cancellation signals.
- Track actions navigate decoded artist/album references and copy the canonical media URI. Invalid optional mappings omit navigation safely.
- Album tracks now follow disc/track position with stable ordering for ties and unknown metadata.
- All discovery retains successful sources when another source fails, with sanitized warnings and explicit total-failure handling.
