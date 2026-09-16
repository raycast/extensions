# Reference plugin behavior spec

Status: resolved
Type: research
Blocked by: —

## Question

Read the full source of ardfard/omarchy-opencode-usage (`collector.sh`, `Model.js`, `Panel.qml`, `Service.qml`, `manifest.json`, `README.md`, `assets/`) and produce a faithful behavior spec a Mac implementer can mirror without re-reading the repo. Cover:

1. The bar-widget ("icon pill"): what icon and text it shows by default, what hover shows (limit %), and what click / middle-click / right-click do.
2. The full panel: its sections and rows (limit windows with progress bars and reset countdowns, model catalog with current $/M, picks), and the wording of labels/units.
3. Quota semantics: is "quota" defined by OCG or estimated by the plugin? Extract the exact estimate computation per model (window ÷ cost basis, the "typical agent turn" token assumptions — 830 input + 71.5K cached + 295 output — and where they're hardcoded).
4. The picks algorithm: stretch quota (most ~req/5h) and best value (top quota excluding the stretch winner), the Muse Spark exclusion, and the "at most once per day" recompute rule.
5. Catalog rendering rules: sort by cost/quota/name, `maxModels` folding into "other", defaults (`maxModels` 12, `sortBy` cost, hourly refresh).
6. Refresh, caching, and error/edge display: force refresh, offline/key-missing rendering, staleness handling.
7. Settings schema and any other behavior in `Service.qml`/`Model.js` that isn't captured by the README.

The spec you produce is the payload; it feeds **Picks & quota parity** and keeps **Raycast UI layout** honest.

## Answer

Full behavior spec: `.scratch/opencode-usage/research/reference-plugin-behavior-spec/findings.md`

- **Windows are OCG-native** (from `/usage`); **quota is plugin-estimated**: per-model quota = `floor($12 ÷ costPerTurn)` where `costPerTurn = (830·in + 71500·cache + 295·out)/1e6`, cache falling back to `2%·in` (hardcoded `Model.js:192-193`).
- **Picks:** stretch = top req/5h candidate; best value = top req/5h excluding the stretch winner (fallback `candidates[1]`); `muse-spark-1.2-contributor` excluded from picks but still listed ("trains on prompts"); recompute ≤ once/24h via `picksUpdated` timestamp.
- **Defaults:** `refreshIntervalSec` 3600 (range 60–3600), `maxModels` 12 (3–30), `sortBy` `cost`; catalog fetch cap `clamp(maxModels·5, 50, 500)`.
- **Catalog:** cost sort `(in+out)` asc (unpriced models at −2 sort top), quota = req/5h desc, name = localeCompare; rows past `maxModels` fold into `other (N)`; row = name + pick tag, `$X/M in · $Y/M out` or "pricing unknown", `~N req/5h`.
- **Interactions:** 32px icon pill; hover `"5h 42% · Weekly 31% · Monthly 18%"`; left-click toggles panel; middle/right-click force-refresh; `r`/`R` in panel force-refresh; opening refreshes only if data older than interval.
- **Edge/errors:** collector always exits 0 with `status:"ok"` — failures silent (`windows:null`/`catalog:[]`); key missing → auth.json hint + `—` rows; no disk cache, in-memory only.

