# Lucky Draw Changelog

## [Initial Release] - {PR_MERGE_DATE}

This first release introduces the core Lucky Draw command set for Raycast,
along with visual polish and test coverage to support the extension.

### Highlights

- Added Raycast entry points for the extension.
- Introduced `Flip Coin` with animation.
- Added `Roll Dice` with rolling-state UI.
- Added `Generate Number` for random values in a range.
- Added `Pick Random Item` with default commands and list input.
- Added `Spin Decision Wheel` with a customizable options UI.
- Added `Random Fact` as the new discovery command.

### Improvements

- Removed the `Shuffle List` command.
- Added screenshots and the extension icon to the README.
- Added shared utilities for randomness, results, and input handling.

### Quality

- Added Vitest setup.
- Expanded domain coverage with tests.

### Fixes

- Removed a stale `RandomFactError` re-export from the random-fact API.
- Fixed type safety in shared random helpers and spin-wheel rendering.
- Cleaned up the lockfile to keep CI installs stable.
- Restored a clean TypeScript check in CI.
