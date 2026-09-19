# Reference plugin behavior spec — ardfard/omarchy-opencode-usage

Source repo: `github.com/ardfard/omarchy-opencode-usage` (branch `main`), files read raw:
`README.md`, `collector.sh`, `Model.js`, `Panel.qml`, `Service.qml`, `manifest.json`, `assets/*.svg`.

Line references below are to those files, cited as `File.qml:NN` etc. This document is the
faithful behavior spec a macOS/Raycast implementer can mirror **without re-reading the repo**.

---

## 1. The bar-widget "icon pill"

Defined in `Panel.qml:57-81` (`WidgetButton`) + `assets/opencode-usage.{png,svg,@2x.png}`.

- **Icon:** centered `Image` of `assets/opencode-usage.png`, 13 px (`Style.space(13)`), shown
  only when the image loaded (`visible: status === Image.Ready`); otherwise the button's text is
  a bare `"·"` middle-dot (`Panel.qml:61`). The SVG is a white bar-chart glyph — two rounded bars
  + a rising line with a tick — on transparent background (`assets/opencode-usage.svg`).
- **Text:** none. `labelVisible: false`, `fixedWidth: Style.space(32)` — a fixed 32 px pill
  (`Panel.qml:62-63`). `active: false` (not highlighted as active).
- **Hover:** `tooltipText` = `Model.tooltipLimits(service.windows, root.nowMs)` → the limit %s,
  formatted `"5h 42% · Weekly 31% · Monthly 18%"` (joining whichever of the three windows exist),
  or `"OpenCode Go — no limits yet"` when there are none / windows is null (`Model.js:53-68`).
- **Click (left):** toggles the panel open/closed (`root.toggle()`, `Panel.qml:68`).
- **Middle-click / right-click:** force refresh (`root.refresh()` → `service.refresh()`,
  `Panel.qml:67`). Mirrored by the manifest description: *"Click: Go limits and cheap models.
  Middle/right click: force refresh."* (`manifest.json:15`).

## 2. The full panel

`KeyboardPanel` (`Panel.qml:83-417`), content width `Style.space(360)`, height capped at
`Style.space(520)` with vertical scroll (`Panel.qml:90-91`). A 30 s `Timer` updates `nowMs` for
countdown/pace recomputation (`Panel.qml:28-33`).

Header (`Panel.qml:117-159`): `assets/opencode-logo.png` icon (≈subtitle-size), bold title
**"OpenCode Go"**, and right-aligned meta line:
`(refreshing ? "…" : (lastUpdated ? "HH:mm" : "never")) + " · R refresh"` (dim).

If `service.lastError !== ""` an urgent (red), word-wrapped error `Text` appears above the first
separator (`Panel.qml:161-170`).

Sections, top to bottom (each between `PanelSeparator`s):

### LIMITS
- Header `"LIMITS"` (dim, bold, caption). Right meta shows urgent **`rate-limited`** only when
  `windows.weekly.status === "rate-limited"` (`Panel.qml:174-202`). Header is hidden entirely when
  `windows` is falsy (`Panel.qml:175`).
- Three window rows in fixed order (`Panel.qml:204-270`): `rolling` label **"5h"**, `weekly` label
  **"Weekly"**, `monthly` label **"Monthly"**.
  Each row is a **progress bar** + right-aligned bold **percent** (`Model.percent` → `Math.round(p*100)+"%"`,
  `Model.js:48-50`). Missing window → `"—"` and empty bar. Bar background is `foreground @ 22%`
  alpha, height 5 px, pill radius (`Panel.qml:231-245`); fill width animates 320 ms ease-OutCubic
  (`Panel.qml:243`). Fill & percent turn **urgent red** when `weekly && Model.behindPace(...)`
  (`Panel.qml:242,252`).
- Below each row, right-aligned dim caption: **`resets <countdown>`** (`Panel.qml:259-268`), where
  `countdown(resetMs, nowMs)` yields: `"now"` if reset already passed; else `"Nd Xh"` (days), `"Xh Ym"`
  (hours), or `"Xm"` (minutes) — `Model.js:70-79`.
- When no `rolling` window is present, a hint line shows:
  **`Add opencode-go key in ~/.local/share/opencode/auth.json for limits.`** (dim, wrapped,
  `Panel.qml:272-281`).

### PICKS
Two lines, each visible only if that pick exists (`Panel.qml:285-307`), foreground caption:
- **`Stretch quota: opencode-go/<id> · ~<N> req/5h`**
- **`Best value: opencode-go/<id> · ~<N> req/5h`**

(`~<N> req/5h` via `Model.formatReq5h`, see §4.)

### CATALOG
- Header `"CATALOG"` (dim, bold). Right meta shows the active sort key: `settingsSortBy() + " ↑"`
  (e.g. **`cost ↑`**, **`quota ↑`**, **`name ↑`**) (`Panel.qml:311-337`).
- One row per model (`Panel.qml:339-403`), name column width `min(170 px, 9 px·len + 24 px)`
  (`Panel.qml:419-421`):
  - **Name** (caption). If the row is a pick, suffix `" · stretch quota"` / `" · best value"`
    (`Model.pickLabel`, `Model.js:350-354`) and **bold**; picks colored foreground, non-picks also
    foreground, the `other` row dim. `ElideMiddle` on long names (`Panel.qml:352-362`).
  - Excluded-models note subtext (urgent, tiny): `"trains on prompts"` for Muse Spark
    (`Panel.qml:364-372`).
  - Right column (hidden on the `other` row) (`Panel.qml:377-401`):
    - **`$<in>/M in · $<out>/M out`** via `Model.pricePer1M` (formatting below), or
      **`pricing unknown`** when no models.dev entry.
    - second line: `~<N> req/5h` or `—` (dim).
  - `other (N)` synthetic row — see §5.
- If catalog empty and not refreshing and no error:
  **`Could not load Go catalog.`** (dim, body, `Panel.qml:405-413`).

### Formatting helpers (`Model.js`)
- `percent` — `Math.round(clamp(v,0,1)*100)+"%"` (`:48-50`).
- `pricePer1M` — `≥1 → "$X.XX/M"`, `≥0.1 → "$X.XX/M"`, else `"$X.XXX/M"`; negative → `"—"`
  (`:213-219`). E.g. `$1.00/M`, `$0.25/M`, `$0.075/M`.
- `tokenCount` — `≥1e6 → "<n>/M"` (0 or 1 dp), `≥1e3 → "<n>K"`, else round (`:161-166`).
- `formatReq5h` — `≤0 → "—"`; `≥1000 → "~"+tokenCount+" req/5h"`; else `"~<n> req/5h"` (`:221-226`).
- `money` (unused in UI), `shortName`, `providerTag` (unused in UI) — exported helpers only.

## 3. Quota semantics: OCG-defined windows vs plugin-estimated quota

Two distinct quantities, and the distinction matters:

- **Limit windows** ($12 rolling 5h, $30 weekly, $60 monthly) come **directly from the OCG API**
  `GET /zen/go/v1/usage`, read under `.usage.rolling / .usage.weekly / .usage.monthly`, verbatim
  (`collector.sh:38-49`). The plugin never computes them. Each window object carries
  `status`, `percent`, `resetsAt`, `limitDollars` — consumed by `Model.normalizeWindow`
  (`Model.js:16-28`), which keeps `limitDollars` in the normalized object but the panel **never
  renders dollar amounts**, only percent + countdown + pace. The `$12/$30/$60` figures appear only
  in `README.md:8` and `ROLLING_BUDGET_USD`.
- **Per-model "quota" (~req/5h)** is **estimated by the plugin** from models.dev pricing. It is the
  only thing the plugin computes. Hardcoded constants live in `Model.js:192-193`:
  ```js
  var TYPICAL = { input: 830, cache: 71500, output: 295 }
  var ROLLING_BUDGET_USD = 12
  ```
  Comment: "Typical agent turn (OpenCode Go docs, MiMo-V2.5 pattern)". Computation
  (`Model.js:200-211`):
  ```
  ccache      = number(live.cache, live.in * 0.02)   // cache_read price; fallback = 2% of input
  costPerTurn = (830·in + 71500·cache + 295·out) / 1e6
  req5h       = floor(12 / costPerTurn),  0 if cost ≤ 0 or ∞
  ```
  Note the cache fallback triggers only when the cache field is missing/NaN — a literal `0` stays 0.
  `requests5h` per model = `floor($12 ÷ cost-per-typical-turn)`.

## 4. Picks algorithm

`Model.catalogPicks(ids, pricingMap)` (`Model.js:268-295`), built from `buildPickCandidates`
(`:250-264`):

1. **Candidate filter** — drop empty ids, ids in `GO_EXCLUDE`, models without a finite
   `in`/`out` price, and models whose `estimateReq5h ≤ 0`. Track `blended = in + out`
   (`blendedCost`, `:228-231`).
2. **Sort candidates** by `requests5h` descending; tie-break by `localeCompare(id)` ascending
   (`:272-275`).
3. **Stretch quota ("volume")** = the single highest-`req5h` candidate (`candidates[0].id`).
4. **Best value ("value")** = highest `req5h` among all candidates **excluding the volume winner**
   (loop `:281-288`). Defensive fallback: if none found but `candidates.length > 1`, take
   `candidates[1].id` (`:289`).
5. Exclusions — `GO_EXCLUDE = { "muse-spark-1.2-contributor": "trains on prompts" }`
   (`Model.js:196-198`). Excluded models are **still listed in the catalog** (with the urgent note
   subtext) but never selected as picks.
6. **At-most-once-per-day recompute** (`Service.qml:21,72-76`): `picksRefreshSec = 86400`.
   On each successful refresh, picks recompute only if `picksUpdated` is unset / epoch-0 **or**
   `Date.now() - picksUpdated ≥ 86400·1000` AND the fresh catalog is non-empty. `picksUpdated` is
   then stamped `now` (even if the catalog was empty, i.e. the daily budget is consumed either way).
   So picks are a daily snapshot over that day's fetched pricing, refreshed every ≤24 h at the first
   normal refresh that trips the gate.
7. `markPicks` (`:297-309`) tags catalog rows by id with `"volume"` / `"value"` → UI labels
   "stretch quota" / "best value".

## 5. Catalog rendering rules

`Model.summarizeCatalog(ids, pricingMap, sortBy, maxN, picks)` (`Model.js:330-348`):

- Build one `catalogEntry` per id (`:233-248`): `displayName` = raw id; `inputPer1M`/`outputPer1M`
  = live price or `-1` when unpriced; `requests5h` (0 when unpriced); `pick` tag; `note` for
  excluded ids; `hasPricing`; `isOther:false`.
- `markPicks` by id.
- **Sort** (`sortCatalog`, `:311-328`) by:
  - `sortBy === "quota"` → `requests5h` desc, tie → name asc.
  - `sortBy === "name"` → `displayName` `localeCompare` asc.
  - otherwise (cost, the default) → `blendedCost = in + out` **ascending**, tie → name asc.
    Edge (faithful): unpriced models have `in=out=-1` → `blendedCost=-2`, so **unpriced models sort
    to the TOP** of the cost order. (Real models.dev pricing makes this rare.)
- **`maxModels` folding** — `limit = max(1, maxN)` rows shown; every remaining row folds into a
  single synthetic row `other (N)` where `N = sorted.length − limit` (`:337-346`), rendered dim with
  no pricing lines (`Panel.qml:355-357`, and pricing column hidden for `isOther`).
- **Defaults** — `maxModels` 12 (clamp 3–30), `sortBy` `"cost"`, `refreshIntervalSec` 3600 (clamp
  60–3600, step 60) (`manifest.json:20-52`, `Service.qml:18-19`, `Panel.qml:35-38`).
  `sortBy` is validated against `["cost","quota","name"]`, else `"cost"`.

## 6. Refresh, caching, error / edge display

### Refresh pipeline
- `Service.refresh()` (`Service.qml:34-40`): guards against re-entry (`refreshing || collector.running`),
  clears `lastError`, launches `env OPENCODE_MAX_CATALOG=<n> bash collector.sh`.
- Startup + every `refreshIntervalSec` via a repeat `Timer` with `triggeredOnStart: true`
  (`Service.qml:42-48`).
- Panel-open refresh: only if `lastUpdated` unset or `Date.now() - lastUpdated > refreshIntervalSec`
  (`Panel.qml:47-50`) — i.e. opening the panel does **not** always force a fetch.
- **Force refresh**: middle/right-click the pill (`Panel.qml:67`), or press `r` / `R` while the panel
  is open and focused (`Panel.qml:97`). Header hints `R refresh`.
- Process exit `≠ 0` → `lastError` = stderr (whitespace-collapsed, trimmed, first 180 chars) or
  fallback `"Collector failed (exit <code>)"` (`Service.qml:58-64`). Previous catalog/pricing/windows
  are **kept** (stale data persists across failures).

### collector.sh (the fetch + sanitize layer)
- Endpoints (env-overridable): `GO_BASE` → `https://opencode.ai/zen/go/v1`; `MODELS_DEV` →
  `https://models.dev/api.json`; `AUTH_JSON` → `~/.local/share/opencode/auth.json`; `MAX_CATALOG`
  default 200, clamped 1–500 (`collector.sh:5-11`). Service sets `MAX_CATALOG` to
  `clamp(maxModels·5, 50, 500)` (`Service.qml:20`).
- **Catalog** (`GET /models`, 15 s timeout): ids only (`data[].id`), non-empty strings, `≤ 128` chars,
  capped at `MAX_CATALOG` (`collector.sh:13-18`).
- **Pricing** (`GET models.dev/api.json`, 15 s, only if catalog non-empty): entries under
  `opencode-go.models`, only ids present in the catalog, only entries with a `cost` object →
  `{in: cost.input, out: cost.output, cache: cost.cache_read}`, `0` defaults (`collector.sh:20-35`).
- **Windows** (`GET /usage`, 10 s, only if auth.json is readable): key read from
  `.["opencode-go"].key` via `jq` → `Authorization: Bearer` header piped into curl on stdin (never
  on argv or a shell var) (`collector.sh:37-49`).
- **Output JSON** (`collector.sh:51-57`): `{status:"ok", windows, catalog, pricing, updatedAt
  (ISO-8601 UTC), error:""}`. `windows` is the raw `.usage.{rolling,weekly,monthly}` object or
  `null`. Note: the collector always exits 0 and always writes `status:"ok", error:""` — hard
  failures surface as `windows:null` / `catalog:[]`, not as errors. `lastError` only fires on
  non-zero exit or parse failure.

### Caching
No disk cache. State lives in `Service` properties (`catalog`, `pricing`, `windows`, `picks`,
`lastUpdated`, `picksUpdated`, `lastError`) for the life of the process. `lastUpdated` drives both
the header clock and the on-open staleness check. Picks have their own 24 h timestamp gate (§4).

### Edge display
- **Key missing / usage fetch failed** → `windows:null` → `service.windows = {}` (parser coerces
  null → `{}`, `Model.js:147`); LIMITS header shows, the three rows render `—` + empty bars, and
  the auth.json hint shows (`Panel.qml:272-281`). Collector exits 0, so **no error line**.
- **Offline** → catalog fetch fails → `catalog:[]`; if the key exists, `windows:null` too →
  both the auth hint (misleading but faithful) and `"Could not load Go catalog."` render; again no
  error line.
- **Malformed collector output** → `"Could not parse OpenCode Go data"` (`Model.js:139-142,155`);
  output > 512 KB → `"Collector output too large"` (`Model.js:92,136-137`).
- **Catalog empty** while not refreshing and no error → `"Could not load Go catalog."`
  (`Panel.qml:405-413`).
- **No catalog but picks line already computed** — picks lines only render when the pick object is
  non-null.

## 7. Service.qml / Model.js / manifest details not captured by the README

- **Settings schema** (`manifest.json:25-53`, clamped in `Service.qml:18-19`):
  - `refreshIntervalSec` integer, label "Refresh interval (seconds)", 60–3600, step 60, default 3600.
  - `maxModels` integer, label "Max catalog rows", 3–30, step 1, default 12.
  - `sortBy` enum, label "Sort catalog by", options `["cost","quota","name"]`, default `"cost"`.
  Settings live in **Omarchy Settings → Widgets** (`README.md:61-65`). `intSetting` clamps to
  [min,max] and falls back on NaN (`Service.qml:28-32`).
- **Id / registry** — manifest `id: "local.opencode-usage"`, `name: "OpenCode Go"`,
  `version: 1.0.0`, `kinds: ["bar-widget"]`, `entryPoints.barWidget: "Panel.qml"`, category `AI`,
  aliases `["opencode-go","opencode-usage","opencode-usage","go-limits"]`, `allowMultiple: false`,
  `defaultSection: "right"` (`manifest.json:1-24`).
- **IPC with the bar shell** — `Panel` base sets `moduleName` and `ipcTarget` both to
  `"local.opencode-usage"` (`Panel.qml:12-14`); `root.toggle()`, `root.switchPanel(direction)`,
  and `root.close()` are Quickshell panel primitives wired through `PanelKeyCatcher`
  (`Panel.qml:93-98`). No custom IPC messages are defined.
- **maxCatalogIds** — `clamp(maxModels·5, 50, 500)` passed to the collector as
  `OPENCODE_MAX_CATALOG`; this caps the **fetched** id list, independent of the `maxModels` display
  fold (`Service.qml:20,38`).
- **Sanitization limits** — collector output capped at 512 KB; catalog capped at 500 ids, 128 chars
  each; pricing only for known catalog ids; `updatedAt` truncated to 40 chars; errors truncated to
  180 chars (`Model.js:92-94,101-157`).
- **Window normalization** — `windowMs`: rolling = 5 h, weekly = 7 d, monthly = 30 d
  (`Model.js:5-13`); `normalizeWindow` derives `remaining = 1 − percent`, parses `resetsAt`
  (`Model.js:16-28`).
- **Pace logic** — `expectedRemaining = (resetMs − now)/windowMs` clamped; a window is
  **behind pace** when `remaining + 0.0005 < expectedRemaining` (`Model.js:30-38`). Only the weekly
  row is red-highlighted in the panel. `paceText` ("On pace" / "N% behind pace" / "N% ahead of pace")
  is exported but **not used** by the panel.
- **`limitDollars`** is normalized and carried but never rendered.
- **Live data flow** — collector output is the single source; `Service` re-parses via
  `Model.parseCollector` on every refresh and overwrites all four state fields, then conditionally
  recomputes picks (§4).

---

## Key decisions to brief the next session (Picks & quota parity, Raycast UI layout)

- **Quota = plugin estimate, not OCG.** Windows ($12/$30/$60) come verbatim from
  `GET /zen/go/v1/usage`. Per-model quota is `floor($12 ÷ costPerTurn)` with
  `costPerTurn = (830·in + 71500·cache + 295·out)/1e6`; cache price falls back to `2%·in`.
  Constants at `Model.js:192-193`.
- **Picks:** volume = top `req5h` candidate; value = top `req5h` excluding the volume winner
  (fallback `candidates[1]`); `muse-spark-1.2-contributor` excluded from picks but still listed with
  note "trains on prompts"; recompute at most once per 24 h (gated by `picksUpdated`, consumed even
  on empty catalog).
- **Defaults:** `refreshIntervalSec` 3600 (60–3600), `maxModels` 12 (3–30), `sortBy` `cost`
  (`cost|quota|name`); fetch cap = `clamp(maxModels·5, 50, 500)`.
- **Catalog:** cost sort = `(in+out)` ascending (unpriced models sort to top at `-2`); quota sort =
  `req5h` desc; name sort = localeCompare; rows beyond `maxModels` fold into `other (N)`; row shows
  name + pick tag, `$<in>/M in · $<out>/M out` or "pricing unknown", and `~<N> req/5h`.
- **Interactions:** pill = icon only (no text, 32 px), hover tooltip `"5h 42% · Weekly 31% ·
  Monthly 18%"`; left-click toggles panel; middle/right-click force-refresh; in panel `r`/`R`
  force-refresh, `Esc` closes, `Tab` switches; open refreshes only if data older than the interval.
- **Error/edge:** collector always exits 0 (`status:"ok"`, empty `error`) — failures surface as
  `windows:null`/`catalog:[]`; key-missing → auth.json hint + `—` rows; offline → same plus
  "Could not load Go catalog."; panel never renders dollar limits, only percent/countdown; weekly
  row red when behind pace; `rate-limited` badge when `weekly.status === "rate-limited"`.
- **Persistence:** in-memory only, no disk cache; 30 s UI timer for countdown/pace ticks.