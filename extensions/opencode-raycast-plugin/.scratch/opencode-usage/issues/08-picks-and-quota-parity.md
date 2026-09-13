# Picks and quota parity

Status: resolved
Type: grilling
Blocked by: 04

## Question

How faithfully should the Mac version reproduce omarchy's quota estimates and daily picks, per the behavior spec from **Reference plugin behavior spec**?

Decide:

- Parity of numbers: must the extension produce the *same* quota figures and stretch/best-value picks as the Linux widget (same token-turn assumptions, same exclusion of Muse Spark, same daily recompute), or is that an omarchy-specific heuristic we may relax on Mac?
- Which models are eligible and whether any are excluded and why.
- Whether the "typical agent turn" cost basis (830 input + 71.5K cached + 295 output tokens) is something the user can tune, or fixed to match the reference.
- Refresh coupling: picks recompute daily from current pricing while limits/catalog refresh more often — confirm that split holds on Mac too.

Record the decision; **Raycast UI layout** and **Menu-bar surface** then render whatever parity this sets.

## Answer

Decision (grilled with human; Q3 overridden):

- **Q1 — Full parity**: the Mac extension produces the *identical* quota figures and stretch/best-value picks as the reference — same token-turn assumptions, same numbers.
- **Q2 — Fixed cost basis**: `costPerTurn = (830·input + 71,500·cached + 295·output) / 1M`, with cache falling back to `2%·input` when absent; quota = `floor($12 ÷ costPerTurn)`. **Not** user-tunable in this spec (parity first; tuning is a follow-up effort).
- **Q3 — No exclusions (human override)**: *every* model is eligible for picks; `muse-spark-1.2-contributor` is treated like any other model — no exclusion and no "trains on prompts" special-casing. Picks remain **two**: stretch = top req/5h, best value = the next-highest req/5h (the reference definition with its exclusion clause removed).
- **Q4 — Refresh split holds**: picks recompute **at most once per 24h**, lazily — on any fetch, if the stored `picksUpdated` is older than 24h, recompute picks from current pricing and restamp; otherwise reuse the cached picks. Limits/catalog refresh independently at the surface cadence (menu bar 60s + on-click, full view on-open) via the shared cache.

Feeds the pick tags rendered by **Raycast UI layout** and **Menu-bar surface** (now no model is ever marked excluded).
