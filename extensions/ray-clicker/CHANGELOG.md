# Ray Clicker Changelog

## [Stability: Render Loop Fix & Persistence Hardening] - 2025-08-26

- fix: Prevent redundant renders by skipping idle tick state updates when estimated gain < 0.01; only advance `lastUpdateRef` (`src/useGameState.ts`).
- fix: Align `lastUpdateRef` to `now` immediately after initial load to avoid an inflated first-tick delta (`src/useGameState.ts`).
- persistence: Gate debounced/periodic autosaves and save-on-unmount on `isLoading` to prevent overwriting progress at startup (`src/useGameState.ts`).
- cleanup: Remove Menu Bar background command and related UI; rely on 50% offline catch-up on open. Clear legacy `idle-menu-bar-active` flag (`package.json`, `src/GameView.tsx`, `src/useGameState.ts`).
  
## [Fix: Idle Accrual Sync & Prestige fix & UX improvements] - 2025-08-22

- Sync main UI state from storage when the menu bar heartbeat is active to reflect idle gains without double-counting (`src/useGameState.ts`).
- Convert menu bar command to a continuous 1s accrual loop; maintain heartbeat, persist each tick, and clean up on unmount (`src/menu-bar.tsx`).
- Add visible "Prestige Now" action and require explicit `GameView` props (remove placeholder overrides) for clarity and top-level correctness (`src/GameView.tsx`).
- Rebalance: Reduce `PRESTIGE_PP_DIVISOR` from 800,000 to 500,000 for faster early prestige (`src/constants.ts`).
- fix: changed wording on some upgrades to make them fit the space better
- fix: prestige upgrade purchase to not update state if it fails
- fix: readded missing prestige upgrade purchase button
- fix: prestige duplication glitch
- fix: idle rate not updating
- add way for user to see how achievement was unlocked
 - fix: ensure initial Menu Bar UI updates when previous UI state is null (avoid self-compare) (`src/menu-bar.tsx`)
 - refactor: centralize prestige points calculation via `calculatePrestigePoints()` and replace duplicates (`src/utils.ts`, `src/index.tsx`, `src/PrestigeView.tsx`, `src/useGameState.ts`)
 - chore: Title-case Menu Bar command title in `package.json` (reviewer-preferred casing)

## [Assets & README compliance] - 2025-08-20

- Set extension icon to `icon.png` (Raycast resolves to `assets/icon.png`) in `package.json`.

## [Polish: Upgrades, Prestige, Store Readiness] - 2025-08-20

- Fix efficiency stacking; treat production efficiency as (1 + effect); `aiOptimizer` as direct multiplier
- Integrate Raycast Pro Mode cost reduction into purchase and previews
- Add auto-clicker effect to idle rate
- Improve upgrade accessories: accurate effect labels (cost %, lucky chance, auto cps, multipliers)
- Milestone bonus now uses highest achieved milestone
- Remove Buy 10 feature and `bulkPurchase` upgrade; simplify UI & causing bugs
- Prestige points accrue faster: `floor(sqrt(totalEarned / 800_000))`
- Truncate design doc overview; expand README with Store checklist
- Add categories to `package.json` and refine description

## [Initial Version] - 2025-08-20

- Idle clicker core gameplay
- Active / Idle / Efficiency upgrades
- Prestige system and UI

## [Polish: Menu Bar] - 2025-08-20

- Menu bar idle accrual
- Menu bar idle rate
- Menu bar UI
- fix: menu bar idle rate not updating
- fix: Not saving to local storage

## [Clean Up & Bug Fixes: Upgrades, Stats Menu, UI] - 2025-08-20

- Add icon for "Click to earn"
- Remove legacy HTML code
- Add silent toast option
- Fixed combo system; was unplugged previously.
- Added combo cap at x3.
- Clean up menu bar UI
- Add better UI & UX to show categories
- Replaced prestige effect label heuristic with explicit metadata.
- Fixed multiple bugs found in upgrades
    - Fixed missed label prestiage effects.
    - Fixed raycastProMode cost reduction math so discount increases with level.
    - Adjust aiOptimizer effect to match intended “×2 all” base and reasonable per-level scaling.
    - Implement prestige effects for quickStart and secondWind.
    - Remove ×5 idle display in `src/index.tsx` (both `GameView` prop and Stats).
    - Correct Stats category level calculation.
    - Make purchaseUpgradeMax silent (no per-level toasts).
- Remove dead branches (autoClickDaemon in prestige purchase) and unused offlineProgressEnabled.
- Title-case fix in `package.json`.
- Changed some upgrades flavor text to better fit.
- Milestone system upgraded.
    - Has its own module `achievements.ts`
    - Add more milestones & cleaned up text.
    - Cleaned up old milestone system.
- Improved stats menu
    - Added milestones & achievements to stats page
    - Cleaned up organization

## [Stability & Store Readiness: Prestige, UX] - 2025-08-20

- Introduce `PRESTIGE_PP_DIVISOR` constant and replace magic number in `src/PrestigeView.tsx` and `src/useGameState.ts`.
- Add `effectDisplay` metadata to prestige upgrades and refactor effect accessory rendering in `src/PrestigeView.tsx`.
- Harden prestige upgrade cost calculation for `costMultiplier <= 0` in `src/prestigeUpgrades.ts`.
- Fix title casing for Menu Bar command in `package.json`.
- Format changelog entries to ISO dates and correct typos throughout.
- Add category switcher to upgrade action menu
