# Ray Clicker Changelog

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