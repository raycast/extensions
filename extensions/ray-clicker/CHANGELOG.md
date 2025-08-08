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

