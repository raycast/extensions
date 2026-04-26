# Tryambakam Noesis Raycast Plan

## Checklist

- [x] Re-scope the extension around Selemene docs instead of the old local-only dashboard assumptions.
- [x] Confirm the authenticated endpoint set needed for onboarding, status, workflows, usage, and readings history.
- [x] Add a Raycast onboarding UI that captures and validates the API key before saving it locally.
- [x] Persist local plugin state in SQLite under Raycast `environment.supportPath` for cached profile, workflows, engines, usage, and readings history.
- [x] Keep the API key out of SQLite and store it in Raycast local storage with environment-variable fallback support for development.
- [x] Refactor command data loading to read cached SQLite state first, then revalidate against Selemene with stale-while-revalidate behavior.
- [x] Expand the dashboard to show account, workflows, usage, and recent readings from the local cache.
- [x] Update menu bar and background quick stats to use cached snapshots instead of hitting the API on every invocation.
- [x] Add or update tests for API mapping, cache persistence, and sync behavior.
- [x] Verify with TypeScript and focused test runs, then document results below.
- [x] Replace the unsupported Raycast `node:sqlite` usage with a runtime-compatible SQLite backend that still writes a local `.sqlite` file.
- [x] Rebuild the installed Raycast extension and confirm onboarding/dashboard load without runtime faults.
- [x] Fix the sqlite3 lock contention in Raycast support storage so menu bar and dashboard reads do not fail after onboarding.
- [x] Rebuild the installed extension and verify the Raycast log no longer reports `database is locked (5)` faults.
- [x] Review the dashboard row actions and confirm why engine, workflow, and reading selections only refresh instead of drilling into deeper flows.
- [x] Audit the Selemene engine, workflow, reading, profile, auth, onboarding, and admin endpoints against the current Raycast client surface.
- [x] Write a concrete upgrade plan for mapped engine/workflow/readings/profile/admin pages, including API key lifecycle handling and invitation constraints.
- [x] Add dedicated Raycast commands for engines, workflows, and readings so the dashboard stops being the only interaction surface.
- [x] Rework the dashboard into a Raycast-native command center with detail panes and push navigation instead of refresh-only row actions.
- [x] Verify the new command manifest and UI compile cleanly with TypeScript and a production Raycast build.
- [x] Harden the upgrade plan using the local `raycast-extension` and `raycast-ui-skills` references before resuming implementation.
- [x] Wire engine and workflow detail surfaces into live execution forms backed by `POST /api/v1/engines/{engine_id}/calculate` and `POST /api/v1/workflows/{workflow_id}/execute`.
- [x] Add a `Noesis Profile` command and editor so birth data, timezone, and reusable preferences can be maintained once and reused by new reading flows.
- [x] Verify the new execution/profile contract mappings with tests and a production Raycast build.
- [x] Align execution payload enums and defaults with the actual Selemene backend contract so engine/workflow runs do not fail on request validation.
- [x] Add a real execution failure state with inline error details plus `Edit Inputs` and `Retry` actions instead of only showing a toast.
- [x] Clean up the Raycast command surface so legacy/internal cache warmers stop cluttering search results as primary Noesis commands.
- [x] Replace the generic menu bar health counters with a current insight surface centered on TCM organ timing plus cached biorhythm and Vimshottari context.
- [x] Persist dedicated menu bar insight snapshots in SQLite and refresh the personal insight cache on a slower background cadence.
- [x] Verify the new command metadata and menu bar insight flow with TypeScript, focused tests, and a production Raycast build.
- [x] Locate and remove the remaining external Raycast script commands that still expose legacy Noesis entries.
- [x] Add a Pulse Mode preference so the menu bar title can switch between TCM organ, biorhythm, and Vimshottari.
- [x] Verify the external cleanup plus Pulse preference with TypeScript, focused tests, and a production Raycast build.
- [x] Simplify detail-mode list rows so titles remain readable without long subtitles colliding with badges and accessory text.
- [x] Apply the compact row pattern consistently across dashboard and browser lists using tooltips, keywords, and detail panes for secondary data.
- [x] Verify the Raycast row-density cleanup with TypeScript and a production Raycast build.
- [x] Rework the dashboard status section into a command-center view with synthesized connection, pulse, account, and cache surfaces instead of raw data rows.
- [x] Remove the menu bar title fallback that shows raw API health like `ok` when pulse data is missing or still syncing.
- [x] Verify the command-center/dashboard and menu bar title polish with TypeScript and a production Raycast build.
- [x] Give the dashboard Explore rail the same command-center tone as the new status surfaces, with stronger titles and compact signals instead of descriptive list copy.
- [x] Tighten menu bar dropdown labels and truncation rules so long pulse titles, summaries, and error strings stay glanceable.
- [x] Verify the Explore/menu bar polish with TypeScript, focused menu bar tests, and a production Raycast build.
- [x] Redesign engine and workflow success screens so results read as interpreted reports instead of raw JSON dumps.
- [x] Surface API request/output context clearly on result pages while keeping full JSON available as a secondary action.
- [x] Verify the result-page polish with TypeScript, focused presenter tests, and a production Raycast build.
- [x] Extend the interpreted result presenter to cached reading detail pages so historical readings match live execution results.
- [x] Add engine-specific hero summaries for known engines like `vedic-clock`, `biorhythm`, and `vimshottari` so result pages feel less generic.
- [x] Verify the reading-detail/hero-summary polish with TypeScript, focused presenter tests, and a production Raycast build.
- [x] Add store submission metadata scaffolding: macOS platform restriction, changelog, gitignore, search keywords, contributor metadata, and lint configuration.
- [x] Initialize a local git repository on `main` and capture the first publish-ready commit.
- [x] Patch the manifest author to the verified Raycast username `mage_narayan` and confirm lint/build pass.
- [x] Re-authenticate GitHub CLI and create the remote repository for this extension.
- [x] Document public-safe screenshot names, placement, and capture requirements for Store metadata.
- [x] Move manually saved screenshot drafts out of runtime `assets/` and into `docs/screenshots-drafts/` with semantic names.
- [x] Rebrand Store-facing product copy from `Selemene Noesis` to `Tryambakam Noesis`, with `Selemene Engine` as the powered-by backend.
- [x] Promote API key editing from hidden onboarding behavior into a screenshot-ready `API Key` command and `Edit API Key` action.
- [x] Clear stale local identity/cache data before warming a profile from a replacement API key.
- [x] Fix command deeplinks to derive the Raycast extension owner/name from `package.json` after the `mage_narayan` author rebrand.
- [x] Rename the API key command slug from `onboarding` to `api-key` so Raycast actions no longer target a disabled/old command.
- [x] Refresh Raycast's local enabled-command registry with `npm run dev` after the `api-key` command rename.
- [x] Replace internal `raycast://` command navigation with Raycast's native `launchCommand` API to avoid blocked command launches.
- [x] Move the latest screenshot drafts out of runtime `assets/` and into `docs/screenshots-drafts/` with stable review names.
- [x] Capture at least three public-safe Raycast metadata screenshots for the Store listing.
- [x] Replace screenshot drafts with `2000x1250` PNG files in top-level `metadata/`.
- [ ] Run network-enabled lint/build checks and attempt `npm run publish` for public Raycast Store review.

## Notes

- Source of truth is `/Volumes/madara/2026/witnessos/Selemene-engine/docs/api/` plus API handlers in `crates/noesis-api`.
- The onboarding flow validates against authenticated API endpoints before saving the key.
- Local persistence preserves workflow and readings retrieval when the API is temporarily unavailable.
- Raycast's runtime does not expose `node:sqlite` here, so the cache backend must use a different SQLite access path while still preserving a real local `.sqlite` file.
- The Raycast support-path database is healthy; the new failure mode is lock contention between overlapping commands against the same sqlite file.
- Engines, workflows, readings, and profile editing now have Raycast-native drill-ins; admin key lifecycle and invite flows are still plan-only.
- Admin API key management and human-user onboarding are different flows and should stay separate in the implementation plan.
- Raycast-native UX for this extension means instant cached first paint, list/detail hierarchy, and background cache warming from sidecar commands instead of view-level polling.
- The menu bar should act like a glanceable “current pulse” surface, not a second dashboard for service health counters.
- Public Store review will likely require git history, GitHub authentication, and screenshot metadata in addition to the extension code itself.
- Raycast lint and build are clean with the verified `mage_narayan` author handle; screenshots and publish submission remain.
- GitHub remote is `https://github.com/Sheshiyer/noesis`; local `main` tracks `origin/main`.
- Screenshot drafts exist for visual review, but the current files are `750x474` or `862x586` and should not be submitted as Store metadata.
- The updated screenshot drafts are now named semantically under `docs/screenshots-drafts/`; the next publish pass should regenerate only the strongest three to six scenes at `2000x1250`.
- `metadata/` now contains three public-safe `2000x1250` PNGs generated from safe drafts: `dashboard-command-center`, `engine-console-biorhythm`, and `profile-defaults`.
- `scripts/generate-metadata-screenshots.sh` reproduces the current metadata set with a consistent framed background treatment.

## Review

- Added a dedicated onboarding command and shared onboarding form that validates `X-API-Key` auth against `GET /api/v1/users/me` before saving configuration.
- Added a local SQLite cache at Raycast `environment.supportPath/noesis-cache.sqlite` for service snapshots, profile, usage, engines, workflows, readings, and reading stats.
- Kept the API key outside SQLite by storing it in Raycast local storage, while still honoring environment variable fallbacks for development.
- Refactored dashboard, menu bar, and quick stats to read cache first and only refresh stale resources based on TTLs.
- Replaced the incompatible `node:sqlite` dependency with a small wrapper around the system `sqlite3` binary so Raycast can still persist a real `.sqlite` cache file at runtime.
- Rebuilt the installed extension bundle and verified the Raycast runtime log after launching `Noesis Onboarding` and `Noesis Dashboard`; the prior `No such built-in module: node:sqlite` fault is gone.
- Generated three store-ready `2000x1250` metadata screenshots under `metadata/` and added a reproducible `ffmpeg`-based generator script for future refreshes.
- Fixed the next runtime issue by making the sqlite wrapper wait on transient locks instead of failing immediately, and by removing the menu bar's extra in-process polling loop that was overlapping Raycast's own refresh scheduling.
- Verified the rebuilt extension after clearing the Raycast log and launching `Noesis Metrics` and `Noesis Dashboard`; the fresh log stayed empty instead of reporting `database is locked (5)`.
- Reviewed the dashboard interaction model and confirmed the current list rows all reuse the same refresh-only action panel, which is why selecting an engine does not start a new reading.
- Audited the backend contracts for `POST /api/v1/engines/{engine_id}/calculate`, `POST /api/v1/workflows/{workflow_id}/execute`, reading detail, profile updates, admin session, admin users, admin API keys, and onboarding invites.
- Wrote the next-pass architecture plan in `docs/plans/2026-04-22-noesis-raycast-upgrade-plan.md`, including phased delivery, endpoint mapping, cache/security rules, and the distinction between human invites and admin-issued API keys.
- Hardened that plan against the local Raycast extension and Raycast UI skill constraints so implementation stays list/detail-first, instant-load, and sidecar-warmed rather than building a web-style shell inside Raycast.
- Implemented the Raycast-native navigation phase with dedicated `Engines`, `Workflows`, and `Readings` commands, shared action panels, and detail-rich browser screens that open real drill-ins instead of firing a generic refresh.
- Rebuilt `Noesis Dashboard` into a command center with `Explore`, `Status`, `Active Engines`, `Featured Workflows`, and `Recent Readings` sections, all using Raycast detail panes and push navigation.
- Wired engine and workflow surfaces into real execution forms that post structured birth-data payloads to Selemene, sync the local cache after success, and render result details inline inside Raycast.
- Added a dedicated `Noesis Profile` command plus dashboard entry points so shared birth data, timezone, and preferences can be edited once and reused by engine and workflow runs.
- Promoted `Run Engine` and `Run Workflow` to the primary actions in the browser and dashboard lists so pressing Enter launches execution instead of another passive view.
- Corrected the execution payload to use Selemene’s real precision enum casing (`Standard`, `High`, `Extreme`) rather than lowercase UI-derived strings.
- Reworked engine and workflow run flows so failures land in a dedicated error detail view with `Edit Inputs`, `Retry Run`, and payload-copy actions instead of disappearing into a toast.
- Cleaned the command manifest so the searchable front door is now `Dashboard`, `Engines`, `Workflows`, `Readings`, `Profile`, `Onboarding`, and `Pulse`; the old `quickstats` sidecar command is gone.
- Rebuilt the menu bar as a current pulse surface: it now shows the active Vedic Clock organ window in the title and surfaces cached biorhythm plus Vimshottari summaries in the dropdown.
- Added a dedicated `menu_bar_insights` SQLite table plus a migration path for existing caches so the installed extension can persist current pulse snapshots without needing a fresh database.
- Moved background warming into the menu bar command cadence itself, with Vedic Clock refreshing at the next organ boundary and biorhythm/Vimshottari refreshing on a two-hour personal insight cadence.
- Removed the leftover standalone Raycast script commands at `~/Library/Application Support/Raycast/script-commands/noesis-dashboard.sh` and `~/Library/Application Support/Raycast/script-commands/noesis-voice.sh`, which were the source of the duplicate legacy Noesis entries in search.
- Added an extension-level `Pulse Title Mode` dropdown preference so the menu bar title can prioritize `TCM Organ`, `Biorhythm`, or `Vimshottari` while still caching and showing all pulse details in the dropdown.
- Reworked dashboard and browser list rows around a compact Raycast detail-mode pattern: primary title stays visible, phase/count signals are compressed into short badges like `P0` and `36R`, and engine IDs or descriptions move into keywords, tooltips, and the right-hand detail pane instead of crowding the left rail.
- Removed long inline subtitles from the most cramped dashboard status and active-engine rows so the selected name is no longer visually blocked by badges or metadata.
- Replaced the dashboard’s old field-by-field `Status` list with a `Command Center` section built around current pulse, Selemene link, profile defaults, usage window, and snapshot cache modules; each row now synthesizes the relevant status cluster and exposes a stronger next action.
- Hardened the menu bar title path so the only generic fallback is `Pulse`; when there is no cached insight yet, the title no longer has any path that can surface raw health text like `ok`.
- Reframed the dashboard’s top rail from descriptive browse rows into a `Launchpad` with named operating surfaces: `Profile Defaults`, `Engine Console`, `Workflow Studio`, and `Reading Archive`, each carrying compact status signals instead of list-style subtitles.
- Tightened the menu bar dropdown with a single `Label · Value` copy style plus explicit truncation for titles, summaries, combined pulse board text, and long error strings so the pulse view stays glanceable under Raycast’s one-line constraints.
- Reworked engine and workflow success screens into report-style result pages with `Reading Brief`, `Request Context`, structured payload sections, and a truncated raw-response preview instead of leading with a full JSON dump.
- Added a pure execution-result presenter module so payload interpretation can be tested without Raycast UI dependencies, and exposed request JSON as a copy action on successful runs.
- Extended the same presenter to cached reading detail pages, so historical readings now render as interpreted reports instead of a `Cached Payload` code block, and added `Copy Request JSON` where the archived payload still includes request context.
- Added engine-specific hero sections for `vedic-clock`, `biorhythm`, and `vimshottari`, using compact markdown tables so the top of a result page surfaces organ/window, energy signature, or dasha focus before the deeper field map.
- Verification completed:
  - `PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild && PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/npx tsc --outDir /tmp/noesis-testbuild`
  - `/opt/homebrew/bin/node --test /tmp/noesis-testbuild/lib/api.test.js /tmp/noesis-testbuild/lib/cache.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`

  - `open 'raycast://extensions/sheshiyer/noesis/onboarding'`
  - `open 'raycast://extensions/sheshiyer/noesis/dashboard'`
  - `tail -n 20 ~/.config/raycast/extensions/noesis/dev.log`
  - `: > ~/.config/raycast/extensions/noesis/dev.log`
  - `open 'raycast://extensions/sheshiyer/noesis/menubar'`
  - `open 'raycast://extensions/sheshiyer/noesis/dashboard'`
  - `tail -n 80 ~/.config/raycast/extensions/noesis/dev.log`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild-20260422-pulse && mkdir -p /tmp/noesis-testbuild-20260422-pulse && PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260422-pulse`
  - `node --test /tmp/noesis-testbuild-20260422-pulse/lib/api.test.js /tmp/noesis-testbuild-20260422-pulse/lib/cache.test.js /tmp/noesis-testbuild-20260422-pulse/lib/menu-bar-insights.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
  - `find "$HOME/Library/Application Support/Raycast/script-commands" -maxdepth 2 \( -type f -o -type l \) 2>/dev/null | sort`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild-20260422-pulse-mode && mkdir -p /tmp/noesis-testbuild-20260422-pulse-mode && PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260422-pulse-mode`
  - `node --test /tmp/noesis-testbuild-20260422-pulse-mode/lib/api.test.js /tmp/noesis-testbuild-20260422-pulse-mode/lib/cache.test.js /tmp/noesis-testbuild-20260422-pulse-mode/lib/menu-bar-insights.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild-20260422-command-center && mkdir -p /tmp/noesis-testbuild-20260422-command-center && PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260422-command-center`
  - `node --test /tmp/noesis-testbuild-20260422-command-center/lib/menu-bar-insights.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild-20260422-launchpad && mkdir -p /tmp/noesis-testbuild-20260422-launchpad && PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260422-launchpad`
  - `node --test /tmp/noesis-testbuild-20260422-launchpad/lib/menu-bar-insights.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild-20260422-results && mkdir -p /tmp/noesis-testbuild-20260422-results && PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260422-results`
  - `node --test /tmp/noesis-testbuild-20260422-results/lib/execution-result-presenter.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild-20260422-reading-presenter && mkdir -p /tmp/noesis-testbuild-20260422-reading-presenter && PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260422-reading-presenter`
  - `node --test /tmp/noesis-testbuild-20260422-reading-presenter/lib/execution-result-presenter.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
  - `mkdir -p /tmp/noesis-testbuild-20260422-profile && PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260422-profile`
  - `node --test /tmp/noesis-testbuild-20260422-profile/lib/api.test.js /tmp/noesis-testbuild-20260422-profile/lib/cache.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild-20260422-runflow && mkdir -p /tmp/noesis-testbuild-20260422-runflow && PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260422-runflow`
  - `node --test /tmp/noesis-testbuild-20260422-runflow/lib/api.test.js /tmp/noesis-testbuild-20260422-runflow/lib/cache.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`

## 2026-04-25 Tarot Result Readability

### Checklist

- [x] Reproduce the current tarot result markdown and confirm why Raycast detail output is unreadable.
- [x] Add a tarot-specific presenter path that renders spread metadata and drawn cards as readable markdown sections.
- [x] Reuse the tarot presentation in cached reading detail pages so live and historical tarot results match.
- [x] Add focused presenter coverage for tarot payloads and verify with TypeScript plus targeted tests.

### Spec

- The tarot engine should not fall back to generic nested-object previews for `positions`.
- Each drawn card should render with a clear slot title, card name, orientation, role in the spread, and concise interpretation signals.
- Spread metadata should stay compact and glanceable in Raycast detail mode.
- Raw JSON should remain available as a secondary surface via the existing copy/preview actions.

### Review

- Root cause: the generic structured presenter hit the depth and array limits for tarot `positions`, which collapsed each card into `Card: 7 field(s)` and cut the spread preview off after four cards.
- Implemented a tarot-specific presentation path in `src/lib/execution-result-presenter.ts` that adds a spread hero section plus per-card markdown blocks with card name, orientation, role, arcana, element, suit, interpretation, and keywords.
- Because cached reading detail pages already flow through the same presenter, the new tarot formatting now applies to both live engine runs and historical tarot readings.
- Added a focused regression test in `src/lib/execution-result-presenter.test.ts` that proves tarot output shows real card sections and no longer emits generic `field(s)` or `more item(s) not shown` placeholders.
- Verification completed:
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild-20260425-tarot && mkdir -p /tmp/noesis-testbuild-20260425-tarot`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260425-tarot`
  - `node --test /tmp/noesis-testbuild-20260425-tarot/lib/execution-result-presenter.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`

## 2026-04-26 Pulse Board In Dashboard

### Checklist

- [x] Confirm how the menu bar pulse snapshot is currently exposed in the dashboard and where the full content is being lost.
- [x] Add a reusable presenter that turns cached menu bar insights into a full pulse-board markdown view for Raycast detail panes.
- [x] Replace the dashboard pulse detail with the full pulse-board view while keeping the current menu bar behavior unchanged.
- [x] Add focused coverage for the new pulse-board presenter and verify with TypeScript plus targeted tests/build.

### Spec

- The same pulse data shown in the menu bar dropdown should be visible inside the main Raycast UI without needing the user to rely on the taskbar surface alone.
- The Raycast view should show the whole pulse board content: current title mode plus the cached TCM Organ, Biorhythm, and Vimshottari sections when available.
- Missing personal pulse sections should explain whether Profile data or a refresh is required instead of silently disappearing.
- The existing menu bar refresh/update behavior should remain intact; this task is about surfacing the same content in the UI, not replacing the menu bar flow.

### Review

- Root cause: the menu bar already had a rich cached pulse board, but the dashboard only rendered a compact `Current Pulse` summary row, so most of the Organ/Biorhythm/Vimshottari content never appeared in a normal Raycast view.
- Added a pure `src/lib/pulse-board-presenter.ts` module that mirrors the menu bar snapshot into a full markdown board with sections for the active title, TCM Organ, Biorhythm, Vimshottari, and overall board status.
- Wired the dashboard pulse row to use that presenter, so selecting the pulse entry in the existing detail-mode dashboard now shows the full menu bar content inside Raycast without changing the menu bar refresh/update flow.
- Added focused coverage in `src/lib/pulse-board-presenter.test.ts`, including the happy path with all insights cached and the fallback path where personal pulse sections explain that Profile data is required.
- Verification completed:
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `rm -rf /tmp/noesis-testbuild-20260426-pulse-board && mkdir -p /tmp/noesis-testbuild-20260426-pulse-board && PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild-20260426-pulse-board`
  - `node --test /tmp/noesis-testbuild-20260426-pulse-board/lib/menu-bar-insights.test.js /tmp/noesis-testbuild-20260426-pulse-board/lib/pulse-board-presenter.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`

## 2026-04-26 Agent Integration Audit

### Checklist

- [x] Audit the manifest, README, API client, cache/query layer, and UI for any real `agent` integration surface.
- [x] Confirm whether agent support is merely hidden from the UI or absent end to end.
- [x] Rebuild the current worktree and capture whether the extension still compiles cleanly.
- [x] Write a concrete review with file references and next-step guidance instead of inferring missing architecture.

### Spec

- This audit should distinguish between existing engine/workflow support and any true `agent` concept.
- If agent integration is missing, the review should say that directly and point to the exact seams where it would need to be added.
- The build check should validate the current worktree as it exists, including the recent pulse-board and presenter changes.

### Review

- Finding: there is no current `agent` integration in the extension surface. The manifest only exposes `Dashboard`, `Engines`, `Workflows`, `Readings`, `Profile`, `API Key`, `Daily Witness`, and `Pulse`, with no agent command, preference, or keyword path in `package.json`.
- Finding: the domain model and cache schema are engine/workflow/readings-specific, not agent-aware. `src/lib/types.ts` defines `EngineSummary`, `WorkflowSummary`, `ReadingSummary`, and menu bar insight types only; `src/lib/cache.ts` persists `workflows`, `engines`, `readings`, `reading_stats`, and `menu_bar_insights` tables only.
- Finding: the API/query layer has no agent endpoint mapping. `src/lib/api.ts` fetches health, status, profile, usage, engines, workflows, readings, and workflow/engine execution only; `src/lib/queries.ts` composes snapshots from those same resources, so there is no hidden agent data waiting for a UI.
- Build review: the current worktree rebuilds cleanly, including the recent pulse-board and presenter work.
- If `agents` should be a real product surface, it needs end-to-end definition across four seams: manifest command/navigation, typed models, cache/query persistence, and concrete API endpoints/contracts.
- Verification completed:
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`

## 2026-04-26 Agent Contract Proposal

### Checklist

- [x] Draft a concrete proposed backend contract for agents instead of guessing in UI code.
- [x] Define the required run states, request/response shapes, and minimal error/result semantics for Raycast.
- [x] Map the contract to the extension seams: manifest/navigation, types, cache/query persistence, and UI.
- [x] Write the proposal as a local plan artifact so implementation can start from a stable spec.

### Spec

- The proposal should treat agents as a distinct resource from engines and workflows.
- The MVP contract must support catalog browsing, run creation, run polling, pause-for-input, cancel, and history.
- The document should stay compatible with the current Raycast cached-first architecture and finite-state UI model.

### Review

- Added `docs/plans/2026-04-26-agent-contract.md` as the first concrete agent contract proposal for this codebase.
- The proposal defines catalog endpoints, run endpoints, run states, result and error payloads, suggested TypeScript models, cache tables, Raycast commands, and delivery order.
- This keeps the next implementation pass honest: backend contract first, then typed client/cache/UI work, instead of inventing an agent surface ad hoc inside the dashboard.

## 2026-04-26 Deep Raycast Review Plan

### Checklist

- [x] Map the extension’s trust boundaries and data flows across Raycast preferences, LocalStorage, SQLite cache, the Selemene API, and the Daily Witness gateway.
- [x] Produce the top five security flaws with severity, exploit path, affected files, and concrete remediation direction.
- [x] Produce the top 10 design improvements spanning command architecture, state flow, UX consistency, and maintainability.
- [x] Produce the top five API/call-handling issues across request routing, retries, parsing, stale-data behavior, and contract mismatches.
- [x] Document exactly how storage works today: what lives in LocalStorage versus SQLite versus in-memory React state, plus TTL/retention and cache-clear behavior.
- [x] Recommend a phased remediation plan that respects the current architecture constraint: robust backend stays authoritative, Raycast keeps a local SQLite cache for accessibility and readability.
- [x] Validate the review against current code references in `package.json`, `src/lib/api.ts`, `src/lib/cache.ts`, `src/lib/queries.ts`, `src/lib/settings.ts`, `src/lib/witness-api.ts`, and the main Raycast surfaces.

### Spec

- This review is for the Raycast extension in `/Users/sheshnarayaniyer/raycast-extensions/noesis`, not the backend repos.
- Use the local guidance from `/Users/sheshnarayaniyer/.claude/skills/raycast-extension/SKILL.md` and `/Users/sheshnarayaniyer/.claude/skills/raycast-ui-skills/SKILL.md` as review lenses, with emphasis on cached-first loading, Raycast-native list/detail UX, and readable surfaces.
- Assume the backend remains the system of record for engines, workflows, profiles, and readings.
- Treat the local SQLite cache as intentional product infrastructure, not technical debt to remove.
- Focus on extension responsibilities:
  - Secure handling of API keys, witness URLs, and cached personal data.
  - Readability and accessibility of Raycast command output and detail panes.
  - Consistency between direct Selemene calls and Daily Witness gateway calls.
  - Operational behavior under stale cache, rate limits, partial failures, and concurrent command usage.
- The final review output should be decision-grade:
  - security findings prioritized by risk
  - design improvements prioritized by user impact and implementation leverage
  - API/call-handling issues prioritized by correctness and resilience
  - storage model written as a clear current-state architecture note

### Initial Review Focus

- Security focus:
  - API key lifecycle in `src/lib/settings.ts` and onboarding rotation flow in `src/components/onboarding-form.tsx`
  - raw payload persistence in `src/lib/cache.ts`, especially readings/profile/menu-bar payload JSON
  - unauthenticated witness client behavior in `src/lib/witness-api.ts`
  - shell-based sqlite access and SQL construction in `src/lib/cache.ts`
- Design focus:
  - split backend surface between `src/lib/api.ts` and `src/lib/witness-api.ts`
  - dashboard/browser/form duplication across `src/dashboard.tsx` and `src/components/*`
  - state ownership and refresh flow in `src/lib/use-dashboard-snapshot.ts` and `src/lib/queries.ts`
- API/call-handling focus:
  - witness gateway used for engine execution but not workflow execution
  - parsing and error handling in `src/lib/api.ts` and `src/lib/witness-api.ts`
  - stale-while-revalidate and sync fan-out behavior in `src/lib/queries.ts`
- Storage focus:
  - LocalStorage for credentials and witness URL
  - SQLite under `environment.supportPath/noesis-cache.sqlite`
  - retention trim for readings, cache invalidation on key rotation, and menu bar insight persistence

### Review

- Security top 5:
  - `P1` API keys are stored in plain Raycast `LocalStorage` instead of a dedicated secret boundary, so any local compromise of Raycast extension storage exposes the Selemene credential directly. Evidence: `src/lib/settings.ts:14-27`, `src/lib/settings.ts:63-75`.
  - `P1` The extension persists high-sensitivity personal data and full backend payloads in SQLite without field minimization or encryption, including profile birth data, reading payloads, and menu bar pulse payloads. Evidence: `src/lib/cache.ts:42-46`, `src/lib/cache.ts:70-81`, `src/lib/cache.ts:89-98`, `src/lib/cache.ts:454-478`, `src/lib/cache.ts:546-574`, `src/lib/cache.ts:616-647`.
  - `P1` Witness routing is effectively open-ended: the extension will post birth date, time, name, coordinates, and timezone to whatever `witnessUrl` is stored or configured, with no hostname allowlist or trust classification. Evidence: `package.json:57-64`, `src/lib/witness-api.ts:94-105`, `src/lib/witness-api.ts:149-156`.
  - `P1` Engine execution silently changes trust boundary when a witness URL exists, because engine runs bypass the authenticated Selemene client and go to the witness gateway instead, while workflow runs do not. That creates inconsistent auth, logging, and data-governance behavior across commands. Evidence: `src/lib/api.ts:22-75`, `src/lib/api.ts:305-319`, `src/lib/api.ts:358-367`.
  - `P2` The cache layer shells out to `sqlite3` and constructs SQL through string concatenation, which is operationally brittle and broadens the local attack surface compared with an in-process storage adapter. Evidence: `src/lib/cache.ts:1-23`, `src/lib/cache.ts:150-187`, `src/lib/cache.ts:710-727`.

- API / call-handling top 5:
  - `P1` No network timeout or abort is applied to Selemene or Witness fetches, so a hanging upstream can wedge the Raycast command until fetch fails at the platform level. Evidence: `src/lib/api.ts:488-533`, `src/lib/witness-api.ts:114-143`.
  - `P1` Witness enrichment is only applied to engine execution, not workflow execution, so the user gets two incompatible runtime contracts for the same product surface. Evidence: `src/lib/api.ts:31-75`, `src/lib/api.ts:305-367`.
  - `P1` Snapshot refresh silently swallows partial API failures through `optionalRequest`, which means missing profile, usage, workflow info, engine info, or readings can degrade to `undefined` with no surfaced provenance. Evidence: `src/lib/api.ts:238-280`, `src/lib/api.ts:869-876`.
  - `P2` `requestJson` assumes any non-empty response body is JSON and can throw a raw parse failure before the extension can normalize the upstream error. Evidence: `src/lib/api.ts:521-529`.
  - `P2` The menu bar sync path uses `Promise.allSettled` and returns only the first failure string, so multi-insight refresh problems are collapsed into a single opaque sync error. Evidence: `src/lib/queries.ts:140-177`.

- Design top 10:
  - Unify `src/lib/api.ts` and `src/lib/witness-api.ts` behind one transport layer with explicit per-endpoint trust policy, timeout policy, and error normalization.
  - Make routing explicit in the UI: users should know when a run goes to Selemene directly versus through the Daily Witness gateway. Current implicit switching happens in `src/lib/api.ts:311-315`.
  - Replace broad raw-payload caching with view-model caching plus optional raw debug snapshots gated behind a debug mode. Current cache stores entire JSON payloads almost everywhere in `src/lib/cache.ts:454-478`, `src/lib/cache.ts:546-574`, `src/lib/cache.ts:616-647`.
  - Collapse duplicate snapshot bootstrap logic in `src/lib/use-dashboard-snapshot.ts:20-99` into one cached-read-plus-refresh flow.
  - Fold menu bar insight loading into the main dashboard snapshot/repository layer instead of running a second detail-path read from `src/dashboard.tsx:56-83`.
  - Convert `Profile` from raw `preferencesJson` editing into typed fields or a schema-driven advanced editor. Current freeform JSON surface is in `src/components/profile-form.tsx:164-169`, `src/components/profile-form.tsx:238-255`.
  - Standardize result rendering so Daily Witness uses the same presenter strategy as engines, workflows, and cached readings. Current bespoke markdown path is `src/daily-witness.tsx:65-149`.
  - Introduce structured refresh diagnostics in the dashboard and browsers so stale or partial cache states explain which resource failed, instead of only surfacing a generic message string.
  - Promote a single repository/service abstraction that owns cache reads, stale policy, and refresh fan-out. Right now `src/lib/queries.ts`, `src/lib/use-dashboard-snapshot.ts`, and `src/dashboard.tsx` each own part of the lifecycle.
  - Define retention and privacy controls in-product, including per-resource TTLs, cache size controls, and a “clear personal data only” path instead of one broad cache wipe.

- Storage architecture:
  - Raycast `LocalStorage` holds `noesis.apiKey`, `noesis.baseUrl`, and `noesis.witnessUrl`. Evidence: `src/lib/settings.ts:9-10`, `src/lib/settings.ts:63-75`, `src/lib/witness-api.ts:91-109`.
  - Raycast preferences provide fallback `baseUrl`, `pulseMode`, and `witnessUrl`. Evidence: `package.json:26-64`, `src/lib/settings.ts:37-49`, `src/lib/witness-api.ts:100-105`.
  - SQLite lives at `environment.supportPath/noesis-cache.sqlite`. Evidence: `src/lib/queries.ts:180-186`.
  - SQLite stores health, full profile snapshot JSON, full usage snapshot JSON, workflow catalog, engine catalog, reading history with raw payload JSON, reading stats, and menu bar insight payload JSON. Evidence: `src/lib/cache.ts:24-102`.
  - In-memory React state holds live command draft data, result views, sync error strings, and current dashboard/menu bar snapshots. Evidence: `src/lib/use-dashboard-snapshot.ts:13-18`, `src/dashboard.tsx:52-54`, `src/components/execution-forms.tsx:74-79`, `src/daily-witness.tsx:254-261`.
  - Retention today is narrow: readings are trimmed to the latest 100 rows, most other cache records persist until overwrite or explicit `clearAll`, and onboarding rotation clears the whole cache when key/base URL changes. Evidence: `src/lib/cache.ts:577`, `src/lib/cache.ts:655-676`, `src/components/onboarding-form.tsx:81-88`, `src/components/onboarding-form.tsx:128-145`.

- Phased remediation plan:
  - Phase 1: harden transport and trust boundaries by adding timeout/abort support, normalized error handling, explicit witness-vs-Selemene routing, and surfaced partial-refresh diagnostics.
  - Phase 2: reduce data sensitivity in storage by moving secrets to a stronger boundary if Raycast permits, minimizing cached payload fields, and adding retention/privacy controls around profile, readings, and pulse data.
  - Phase 3: simplify product architecture by consolidating transport, repository, and presenter layers so dashboard, browsers, menu bar, engine runs, workflow runs, and Daily Witness all share the same state model.
  - Phase 4: improve readability and operability by replacing raw JSON editing with typed controls, adding structured stale-state messaging, and preserving full raw payloads only for explicit debug actions.

## 2026-04-26 Review Remediation Pass

### Checklist

- [x] Move request execution onto a shared HTTP transport with timeout support, normalized network/HTTP/parse errors, and one place for auth header handling.
- [x] Make engine and workflow execution routing explicit, preference-driven, and visible in the UI instead of silently switching to Witness when a URL exists.
- [x] Prefer Raycast secure password preferences for API keys while preserving a legacy fallback path that does not break the current onboarding flow.
- [x] Add structured sync issues to dashboard/menu bar refresh flows so partial failures are surfaced with resource-level context.
- [x] Minimize cached result payloads by default, keep raw JSON as a copy/debug surface only, and add retention/privacy controls for reading history and personal cache clearing.
- [x] Replace raw profile preferences JSON editing with typed controls for the fields the extension actually uses, while preserving unknown backend preferences on update.
- [x] Route Daily Witness detail rendering through the shared presenter layer so engines, workflows, cached readings, and witness results follow the same readability rules.
- [x] Verify with targeted unit tests, TypeScript, and full extension build.

### Spec

- The Selemene backend remains authoritative for status/profile/catalog/history; this pass hardens the Raycast client, not the backend contract.
- Witness remains a supported execution surface, but it must be an explicit operator choice rather than an implicit side effect of `witnessUrl` being set.
- Local SQLite stays in place, but the default cached shape should hold the minimum data needed for readable Raycast history and pulse surfaces.
- Raw JSON should be reachable through explicit copy/debug actions, not rendered by default in primary markdown views.
- The profile form should expose typed preference controls only for known extension-facing keys today:
  - default precision
  - default workflow
  - preserve unknown preference keys round-trip without exposing them as freeform JSON

### Review

- Added shared request transport in `src/lib/http.ts`, moved Selemene and Witness clients onto it, and normalized timeout/network/HTTP/parse failures before they hit Raycast UI flows.
- Execution routing is now explicit and preference-driven through secure Raycast preferences, with route visibility added to dashboard, menu bar, and execution result metadata.
- SQLite caching now defaults to minimized reading and pulse payloads, supports configurable reading-history retention, and exposes a personal-cache clear path without deleting catalog/service snapshots.
- Daily Witness markdown now runs through the same presenter layer as engine, workflow, and cached reading output, and raw JSON is limited to explicit copy actions instead of inline preview sections.
- Browser and pulse views now expose cache state plus structured sync issues so stale/partial refreshes are readable without dropping into logs.
- Verification:
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --outDir .tmp-testbuild`
  - `node --test .tmp-testbuild/lib/api.test.js .tmp-testbuild/lib/cache.test.js .tmp-testbuild/lib/execution-result-presenter.test.js .tmp-testbuild/lib/menu-bar-insights.test.js .tmp-testbuild/lib/pulse-board-presenter.test.js`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`

## 2026-04-26 README And Release Copy Refresh

### Checklist

- [x] Scan the repo, current README, screenshots, quickstart, and store-submission docs to identify the real product story, command surface, and available assets.
- [x] Confirm positioning choices with the user: audience, badge/screenshot preference, scope of README vs store copy, and whether to generate release-facing language alongside the README.
- [x] Rewrite `README.md` so it reads like a strong landing page for `Tryambakam Noesis`, with updated links, command/value framing, and current architecture/runtime details.
- [x] Update adjacent release-facing docs and descriptions where needed, including `QUICKSTART.md`, `docs/store-submission.md`, and manifest copy in `package.json`.
- [x] Verify link targets and run a build/typecheck pass after doc and metadata updates.

### Review

- Rewrote `README.md` into a clearer landing-page style document with a stronger product pitch, flat-square badge bar, screenshot gallery, command table, runtime diagram, privacy/storage section, and direct links into quickstart, changelog, and store docs.
- Updated `QUICKSTART.md` to the current command model and hardening work: secure preference-first key handling, explicit execution routing, current preferences, and the live command surface.
- Updated `docs/store-submission.md` into a release-facing copy guide with recommended manifest/store description text, screenshot narrative, link inventory, and publish checklist.
- Refreshed `package.json` description and keywords, and added explicit `homepage`, `repository`, and `bugs` links so package metadata matches the rewritten docs.
- Added `.readme-gen.json` to preserve the selected README generation style (`modern`, `flat-square`) for future refreshes.
- Verification:
  - `git branch --show-current`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
  - `PATH=/opt/homebrew/bin:$PATH npm run build`
