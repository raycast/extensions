# Map: opencode usage for Raycast

## Destination

A decided, build-ready spec for one Raycast extension in this repo that surfaces the user's **OpenCode Go** subscription on macOS: the three **limit windows** (rolling 5h / weekly / monthly) with progress and reset countdowns, the **model catalog** with current $/M pricing, and the daily **picks** — shown both in a normal Raycast command and in a Raycast **menu-bar command** (icon + live limit text + dropdown). The key is reused from `~/.local/share/opencode/auth.json`. The map is done when nothing is left to decide before someone builds the extension.

## Notes

- **Reference to mirror:** ardfard/omarchy-opencode-usage (Omarchy bar widget). Its `collector.sh`, `Model.js`, `Panel.qml`, `Service.qml` define the data flow and behavior to replicate; read them before any design ticket.
- **Data sources:** `https://opencode.ai/zen/go/v1/usage` and `/models` (Bearer key); pricing from `https://models.dev/api.json` under `opencode-go`. OpenCode Go product docs at https://opencode.ai/docs/go/.
- **Standing preferences (settled pre-map):** planning-first (map ends in decisions/spec, build is a follow-up); full parity with the reference (windows + catalog + picks); one extension covering both surfaces (menu-bar presence is a Raycast menu-bar command unless research forbids); key auto-read from auth.json with paste-key fallback; private/local scope, but scaffolded Store-compatible.
- **Working style:** one ticket resolved per session (research excepted, resolved by subagents). Tickets worked with a human go through grilling + domain-modeling; UI-shape questions are prototypes. Decisions live in their ticket only; the map never restates, only gists and links.
- **Repo state:** this repo is an empty scaffold (no code yet); `.scratch/` is the tracker, all under the local-markdown convention in `docs/agents/issue-tracker.md`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Raycast menu-bar command limits](issues/01-raycast-menu-bar-command-limits.md): `MenuBarExtra` is a supported macOS command type; dynamic title+icon re-render per launch/background/menu-click; refresh floor 10s (practical ~30s–1m) via manifest `interval` + background refresh; extensions aren't sandboxed so reading auth.json + calling the API is fine.
- [OCG API and pricing schema](issues/02-ocg-api-and-pricing-schema.md): `/usage` returns rolling/weekly/monthly windows each as `{status, percent, resetsAt}` (no dollar amounts; caps are $12/$30/$60 from docs); key lives at `~/.local/share/opencode/auth.json` → `opencode-go.key` (macOS = Linux); `/models` is public; pricing from models.dev `opencode-go.models` (no promos); errors classify as no-key / 401 bad-key / 403 no-entitlement / offline.
- [Raycast extension scaffold and store conventions](issues/03-raycast-extension-scaffold-conventions.md): scaffold with `create-raycast-extension`; `@raycast/api` latest 2.2.1; `List`/`Detail`/`MenuBarExtra`/`getProgressIcon`/`Cache`/`launchCommand` are the building blocks; background refresh via manifest `interval` (floor 10s), off by default on Store; strict TS.
- [Reference plugin behavior spec](issues/04-reference-plugin-behavior-spec.md): windows are OCG-native, quota is plugin-estimated (`floor($12 ÷ costPerTurn)` with 830/71.5K/295 token turn); picks = stretch + best-value (Muse Spark excluded, ≤1/day); defaults interval 3600s / maxModels 12 / sortBy cost; 32px icon pill with hover `5h · Weekly · Monthly`; silent failure + in-memory only.
- [Auth and key handling](issues/05-auth-and-key-handling.md): auth.json (`opencode-go.key`) is the key source of truth, Raycast `password` pref only a fallback, never written back; key read fresh each fetch; failure matrix — no-key/bad-key(401)/no-entitlement(403) show error states (menu bar `--`), offline is the only mode keeping last-known data; key never persisted/logged beyond the Keychain-backed pref. This Mac has auth.json but no Go key yet.
- [Raycast UI layout](issues/06-raycast-ui-layout.md): **Catalog-first** single command wins (prototype variant C): limit windows as a pinned chip row with progress bars, model rows with text modality subtitle, cost + req/5h tags in the accessory, picks tagged inline, `other (N)` fold; modality from models.dev `modalities` (text, not icons); actions = force refresh / open prefs / copy price / open in browser; error states per the Auth and key handling matrix.
- [Menu-bar surface](issues/07-menu-bar-surface.md): **icon-only pill** (OpenCode logo, no text, always rendered); click opens a dropdown carrying the full Catalog-first view as menu items — Go limits with progress bars, two-line model rows (full-width name; modality + cost + req/5h + pick chips wrapping on line two), `other (N)` fold, actions; refresh = 60s background interval + on click, both surfaces share one LocalStorage cache; `MenuBarExtra` renders menu items, not a list.
- [Picks and quota parity](issues/08-picks-and-quota-parity.md): **full parity** with the reference's quota math (`floor($12 ÷ costPerTurn)`, turn = 830 in / 71.5K cache / 295 out, cache fallback 2%·in), fixed not tunable; **no exclusions** (human override) — every model eligible, picks = stretch + best value (next-highest req/5h); picks recompute lazily ≤ once/24h from current pricing; limits/catalog refresh independently at surface cadence.
- [Extension naming and final defaults](issues/09-extension-naming-and-final-defaults.md): name "opencode usage", description "opencode usage — limit windows, model catalog, and daily picks."; icon = opencode logo (color for commands, monochrome template for the pill); `maxModels` preference default 12 (mirrors reference); pricing cache TTL 24h (cached separately), usage at surface cadence, full view refreshes on open only if payload >60s old.

## Not yet specified

Empty — the map is complete: every decision is settled and the way to the destination is clear.

## Out of scope

- Tracking the user's own non-Go token/cost spend (opencode sessions/costs) — a different product from OCG subscription limits.
- Notifications when nearing limits.
- Cross-device sync of state.
- Raycast Store publishing for now (scaffold stays Store-compatible, that's all).
- Supporting agents other than opencode against the shared Go key.
