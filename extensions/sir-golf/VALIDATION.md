# VALIDATION.md — ESPN golf API, Phase 0 data spike

**Date:** 2026-06-24 (mid-week, no live round in progress — Travelers Championship starts 2026-06-25)
**Probes:** `spike/probe.ts`, `spike/probe2.ts` (throwaway; kept as documentation — run `npx tsx spike/probe.ts`)
**Method:** plain Node 20 `fetch`, **no headers, no user-agent, no auth, no key.**

---

## VERDICT: ✅ GO (at $0)

All three $0 legs hold for a **PGA + LPGA + DP World (eur)** live-leaderboard + schedule extension:

| Leg | Result |
|---|---|
| **$0 data** | ESPN `site.api.espn.com` returns `200 OK` to a plain keyless `fetch`. No signup, no token, no credit card. ✅ |
| **$0 infra** | Pure client-side fetch from Node — no backend needed. The schedule rides along in the same cheap call as the leaderboard. ✅ |
| **$0 publishing** | (Not tested this session — Raycast Store is a free GitHub PR; unchanged.) ✅ |

Ship scope honestly = **PGA, LPGA, DP World Tour**. Champions Tour is *thin*, LIV is *effectively absent* (see caveats). Off-season degrades **gracefully** (HTTP 200 + empty `events[]`, never a 404).

---

## Endpoints (all verified live this session)

Base: `https://site.api.espn.com/apis/site/v2/sports/golf`

| Purpose | URL | Notes |
|---|---|---|
| **Leaderboard / current event** | `{base}/{tour}/scoreboard` | ~37 KB, ~30 ms. Returns the current/most-recent event + full field. |
| **Leaderboard for a specific day** | `{base}/{tour}/scoreboard?dates=YYYYMMDD` | Returns that day's event in its **final** state (history is post-state, not a live replay). |
| **Season schedule** | **`leagues[0].calendar`** inside the cheap `{base}/{tour}/scoreboard` call | 48 entries, `label`/`startDate`/`endDate`/`id`. **No extra request needed.** |
| **Season schedule (heavy, avoid)** | `{base}/{tour}/scoreboard?dates=YYYY` | Same 48 events but **17 MB** (full field per event). Do **not** use for "This Week". |
| **No-such-path control** | `{base}/{tour}/schedule` | `404` — this path does **not** exist; the calendar is the schedule. |

`{tour}` ∈ `pga`, `lpga`, `eur` (DP World), `champions-tour`, `liv`.

---

## JSON paths to the fields we render

From `{base}/{tour}/scoreboard`:

```
events[0].name                                   → "U.S. Open"            (tournament name)
events[0].shortName                              → short name
events[0].date                                   → start datetime (ISO)
events[0].status.type.state                      → "pre" | "in" | "post" (DRIVES empty/live/final UI)
events[0].status.type.detail                     → "Scheduled" | "Final" | live clock text
events[0].competitions[0].status.type.detail     → "Final" / round info at event level
events[0].competitions[0].competitors[]          → the leaderboard rows
```

Per competitor (`...competitors[i]`):

```
.order                  → integer rank 1..N         → POSITION (see ties caveat)
.athlete.displayName    → "Wyndham Clark"           → PLAYER
.athlete.flag.href      → country flag image URL    → (nice-to-have icon)
.score                  → "-4" | "E" | "+2"         → TOTAL (to par)
.linescores[]           → per-round (period 1..4)   → round-by-round; .linescores[r].displayValue = round-to-par
```

Schedule rows (`leagues[0].calendar[i]`):

```
.label        → "Travelers Championship"   (tournament name)
.startDate    → ISO                         (THIS WEEK / dates)
.endDate      → ISO
.id           → event id
```

> One parser serves the leaderboard for **pga / lpga / eur** — competitor keys are byte-for-byte identical across them (see reliability Q3).

---

## The four reliability questions — answered

### Q1. What does the leaderboard return when NO tournament is live (mid-week / off-season)?
**Graceful HTTP 200 with an empty `events[]` array — never a 404.** Verified by querying quiet/off-season dates:

| Query | Result |
|---|---|
| `?dates=20260105` (Mon, off-season) | `200`, `events=0` |
| `?dates=20251225` (deep winter) | `200`, `events=0` |
| `?dates=20270705` (far-future, no event) | `200`, `events=0` |
| **today, default call (mid-week between events)** | `200`, `events=1` but event `state="pre"` (Travelers, not yet started) — `score="E"` for everyone, `thru` empty |

So there are **two** empty/degraded states the UI must handle as first-class:
1. **`events.length === 0`** → "No tournament this week" empty state. Use `leagues[0].calendar` to show *next* upcoming event.
2. **`events[0].status.type.state === "pre"`** → tournament scheduled but no scores yet → "Starts <date>" state, not a blank leaderboard.

### Q2. Rate limiting / IP throttling on repeated calls?
**None observed.** 20 rapid sequential calls to `/pga/scoreboard`: **all `200`**, status histogram `{"200":20}`, latency min 21 ms / avg 34 ms / max 142 ms. No `429`, no `403`, no slow-down. Raycast's `useFetch` + built-in cache keeps real usage far below this. (Still: be a good citizen — cache, don't poll aggressively.)

### Q3. Is the response shape consistent across tours (one shared parser)?
**Yes, for pga / lpga / eur.** Competitor object keys are identical: `id, uid, type, order, athlete, score, linescores, statistics`. Same `events[].competitions[].competitors[]` nesting, same `athlete.displayName` / `score` / `linescores` paths. One parser covers all three. (Champions Tour / LIV returned no competitors to compare — see caveats.)

### Q4. Any auth / referer / user-agent requirement?
**No.** Every call in both probes used a bare `fetch(url)` with **zero headers** and returned `200` with valid JSON. No key, no referer, no UA spoofing required.

---

## $0 confirmation
No API key, no account, no paid tier, no backend, no hosting touched. Every byte came from anonymous public `fetch`. Recurring cost to run the extension: **$0.**

---

## Tour coverage (verified this session)

| Tour | League name | Status today | Verdict |
|---|---|---|---|
| `pga` | PGA TOUR | Travelers (pre), 72 in field; US Open history fully populated | ✅ **Ship** |
| `lpga` | Ladies Pro Golf Association | KPMG Women's PGA (pre), 156; Meijer LPGA history populated | ✅ **Ship** |
| `eur` | DP World Tour | Open d'Italia (pre), 156 | ✅ **Ship** |
| `champions-tour` | PGA TOUR Champions | DICK'S Open returned event but **0 competitors** | ⚠️ Thin — verify field populates during live play before claiming support |
| `liv` | LIV Golf Invitational Series | event "Louisiana" but **state=post / Postponed / 0 competitors** | ❌ Effectively absent — do **not** claim LIV support |

---

## Caveats (read before publishing)

1. **Unofficial API, no SLA.** `site.api.espn.com` is undocumented and can change shape or vanish without notice. This is the single biggest risk; the extension must fail soft (error state, never a crash). Mitigation: defensive parsing, treat every field as possibly-missing.
2. **Live per-competitor `thru` and tie-aware position NOT captured this session.** Mid-week there is no in-progress round, and historical `?dates=` queries return events in **final** state, not a live snapshot. For pre/post events, **position = `order`** and **total = `score`** (both verified). The live-only fields — `thru` ("through 14"), and proper tie display like "T5" — must be confirmed during **Phase 2 soak against an actual live round** (e.g. Travelers, Thu–Sun 2026-06-25..28). The extension renders `order` as position and `score` as total today; wire up `thru` once its live path is observed.
3. **Champions Tour is thin / LIV is absent.** Only claim **PGA + LPGA + DP World** in the store listing.
4. **Avoid the 17 MB schedule payload.** `?dates=YYYY` works but is huge. Use `leagues[0].calendar` from the cheap default call instead (same 48 events, in the 37 KB response).
5. **`/{tour}/schedule` is a 404** — not a real path. The schedule lives in the scoreboard's `calendar`.

---

## Fallbacks (not needed — GO — but recorded)
If ESPN ever wobbles: official tour **iCal/ICS schedule feeds** cover "This Week" for free (schedule-only, no live scores); a second free scoreboard source would be needed for live leaderboard. Not pursued — ESPN is GO.

---

## Open questions left for the human (from the brief)
- **World ranking (OWGR top 100):** no free source identified in this spike → recommend dropping that command (already out of Phase-1 scope).
- **LIV:** confirmed effectively unavailable via ESPN. Drop.
- **Off-season (Nov–Feb):** API stays up and returns empty gracefully; a schedule-only "This Week" remains useful in winter via `calendar`. Worth shipping year-round.
- **Branding:** default neutral; decide after soak.
- **Shared pipeline:** the `scoreboard` + `calendar` shape here is exactly what doc 10's web tracker/digest would reuse — the data layer validated here is portable.
