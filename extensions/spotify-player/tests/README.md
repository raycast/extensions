# Spotify library regression fixtures

Run `npm test` for lifecycle/API regression tests and `npm run test:memory -- browse|picker|scan|navigation` (choose one scenario) for sampled heap/request measurements. See ../PR_REVIEW.md for fixture details and measured results.

The harness uses the installed React renderer and **real** @raycast/utils hooks. Only Spotify, Raycast UI/cache/storage, authentication, and unrelated radio/footer/native-app checks are substituted. Raycast host items mount their `actions`, while Action.Push targets remain unmounted until explicit navigation. Native filtering is not emulated: tests verify later-page item availability; native filtering/keyboard behavior remains a manual check.

Use `BASELINE_REF=<pre-change-ref>` to load actual old source through `git show`. The initial standalone snapshot is `d0b62b5`; all its source files matched upstream main `162554d2741b7528614862c7b7cf80334de632f4`. In the monorepo set `BASELINE_PREFIX=extensions/spotify-player/` and use the upstream revision. Run the before peak with `--max-old-space-size=1024`; the 100 MiB run intentionally aborts (disable core dumps first). The harness and renderer add their own heap overhead; these are not Raycast runtime measurements.
