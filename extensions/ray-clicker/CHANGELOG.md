# Ray Clicker Changelog

## [Polish: Upgrades, Prestige, Store Readiness] - {2025-08-07}

- Fix efficiency stacking; treat production efficiency as (1 + effect); `aiOptimizer` as direct multiplier
- Integrate Raycast Pro Mode cost reduction into purchase and previews
- Add auto-clicker effect to idle rate
- Improve upgrade accessories: accurate effect labels (cost %, lucky chance, auto cps, multipliers)
- Milestone bonus now uses highest achieved milestone
- Remove Buy 10 feature and `bulkPurchase` upgrade; simplify UI & causing bugs
- Prestige points accrue faster: `floor(sqrt(totalEarned / 800_000))`
- Truncate design doc overview; expand README with Store checklist
- Add categories to `package.json` and refine description

## [Initial Version] - {2025-08-07}

- Idle clicker core gameplay
- Active / Idle / Efficiency upgrades
- Prestige system and UI

## [Polish: Menu Bar] - {2025-08-08}

- Menu bar idle accrual
- Menu bar idle rate
- Menu bar UI
- fix: menu bar idle rate not updating
- fix: Not saving to local storage

## [Clean Up & bug fixes: Upgrades, Stats Menu, UI] - {2025-08-015}

- Add icon for "Click to earn"
- remove legecy html code
- add silent toast option
- Fixed combo system, was unpluged previously.
- Added combo cap at x3.
- clean up menu bar UI
- Add better UI & UX to show categories
- Replaced prestige effect label heuristic with explicit metadata.
- fixed multiple bugs found in upgrades
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
- Milestone upgraded.
    - Has its own module Achievement.ts 
    - Add more milestones & cleaned up text.
    - Cleaned up old milestone system.
- Improved stats menu
    - Added milestone & achievements to stats page
    - Cleaned up organization
