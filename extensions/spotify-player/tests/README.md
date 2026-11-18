# Spotify library regression fixtures

Run from the extension directory:

```sh
npm ci
npm test
npm run test:memory -- browse
npm run test:memory -- picker
npm run test:memory -- scan
npm run test:memory -- navigation
```

The executable tests live in `src/__tests__`, where their real `react-test-renderer` imports satisfy the repository's source-import requirement for dependencies. The renderer remains a development dependency and no command imports the tests. `tests/harness.cjs` supplies the fixtures and TypeScript loader.

## Fixture scope

The harness uses the installed React renderer and **real** @raycast/utils hooks. Spotify responses, Raycast UI/cache/storage, authentication, and unrelated radio/footer/native-app checks are substituted. Raycast host items mount their `actions`, while Action.Push targets remain unmounted until explicit navigation. Native filtering is not emulated: tests verify later-page item availability; filtering/keyboard behavior remains a manual check.

The memory fixture contains 120 playlists across three catalog pages, each with 2,500 tracks. Full track objects include artist, album, image, external URL, and market metadata. The mock honors the production URI-only fields projection for membership checks. The navigation scenario opens and unmounts library, album, and picker views for 25 cycles, scanning a different selected playlist each cycle.

The regression suite also covers a 275-playlist catalog, duplicates beyond track 1,000, null/relinked tracks, invalid continuation, cancellation, concurrent checks, out-of-order search/selection responses, add/remove and duplicate overrides, favorites, and quicklinks. Failure cases verify removal during pending/failed background checks, explicit quicklink retry after scan or mutation failure, and opening the picker after Now Playing's secondary requests fail.

## Sampled memory results

Measured on macOS arm64 with Node 24.12.0, React 19.0.0, and the installed Raycast utils. Heap is sampled using `process.memoryUsage().heapUsed` at API/cache boundaries, between React flushes, and with a 1 ms timer. These are sampled peaks, not exact allocator high-water marks. Figures include the renderer, TypeScript loader, and in-memory substitutes for Raycast's disk cache; startup heap is about 27.0 MiB. Serialized bytes count cumulative cache writes.

| Scenario                                         | Peak heap | Requests                                  |                  Peak concurrency | Serialized writes |
| ------------------------------------------------ | --------: | ----------------------------------------- | --------------------------------: | ----------------: |
| Before: one track action panel, cold cache       | 401.0 MiB | 3 catalog + 1 profile + 2,400 track pages |                               120 |          2.78 MiB |
| After: identical panel                           |  27.8 MiB | 0                                         |                                 0 |                 0 |
| After: chooser and selected 2,500-track playlist |  33.1 MiB | 3 catalog + 1 profile + 50 track pages    |                                 2 |         0.016 MiB |
| After: isolated 2,500-track scan                 |  27.8 MiB | 50 track pages                            |                                 1 |                 0 |
| After: 25 navigation cycles                      |  58.3 MiB | 1,290 total, including 1,250 track pages  | 7 overall; membership capped at 2 |          0.56 MiB |

The before peak requires a 1,024 MiB old-space cap. The initial investigation also reproduced an allocation failure under a 100 MiB cap. All after scenarios complete with the 100 MiB cap; after navigation/unmount/GC, heap is about 29.6 MiB. The initial library's six category requests plus profile explain the overall concurrency of seven.

## Reproducing the baseline

`BASELINE_REF` loads actual old source through `git show`. The initial standalone snapshot is `d0b62b5`; its source files matched upstream main `162554d2741b7528614862c7b7cf80334de632f4` during the initial investigation.

```sh
BASELINE_REF=d0b62b5 node --expose-gc --max-old-space-size=1024 src/__tests__/memory.mjs browse
```

In the monorepo, set `BASELINE_PREFIX=extensions/spotify-player/` and use the upstream revision. To reproduce the expected old-code OOM, first disable core dumps (`ulimit -c 0`), then use `--max-old-space-size=100` instead of `1024`.

These fixtures do not validate Spotify authentication or native Raycast behavior. The Node old-space cap differs from Raycast's exact extension heap accounting. Native macOS Raycast was not exercised; Windows validation is unavailable. No user library was read or modified.
