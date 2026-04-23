# Tryambakam Noesis

**Self-Consciousness as Technology. Body as Medium. Breath as Interface.**

Tryambakam Noesis is a Raycast command center for self-consciousness practice, powered by the Selemene Engine. It brings engine execution, workflow synthesis, cached readings, reusable profile defaults, and a pulse-oriented menu bar into Raycast without turning the interface into a web dashboard.

Selemene is the computational layer underneath: the API that calculates engine outputs, executes workflows, and returns structured reading payloads. Tryambakam Noesis is the practitioner-facing surface: a compact field console for reading what is active, running the next calculation, and keeping the raw JSON available without making it the primary experience.

## What It Does

- Connects a Selemene Engine API key through a Raycast onboarding form.
- Validates the key against `GET /api/v1/users/me` using `X-API-Key` auth.
- Stores the API key in Raycast local storage, not in SQLite.
- Stores cached service, profile, usage, workflow, engine, reading, and pulse data in local SQLite under Raycast `environment.supportPath`.
- Reads cached data first, then refreshes stale resources from the Selemene Engine with stale-while-revalidate behavior.
- Runs individual engines and workflows with reusable profile defaults.
- Renders execution and reading results as interpreted reports, with raw JSON available as a secondary action.

## Commands

1. `Dashboard` - Tryambakam Noesis command center for profile defaults, engine status, pulse state, catalog health, and recent activity.
2. `Engines` - Browse Selemene Engine lenses, inspect phase coverage, and run a new reading.
3. `Workflows` - Browse synthesis workflows and execute multi-engine runs.
4. `Readings` - Review cached reading history with interpreted result pages.
5. `Profile` - Maintain shared birth data, timezone, and reusable preferences once.
6. `API Key` - Connect, edit, or rotate the Selemene Engine API key and warm the local cache.
7. `Pulse` - Menu bar surface for current TCM organ timing plus cached biorhythm and Vimshottari context.

## Configuration

Primary path:

- Run `API Key`
- Paste the Selemene Engine API key (`nk_...`)
- Optionally override the base URL
- Paste a new key later to rotate accounts; Tryambakam Noesis clears the old local snapshot before warming the replacement profile.

Fallbacks still supported for development:

- `baseUrl` Raycast preference
- `pulseMode` Raycast preference (`TCM Organ`, `Biorhythm`, or `Vimshottari`)
- `NOESIS_API_BASE_URL` / `SELEMENE_BASE_URL`
- `NOESIS_API_KEY` / `SELEMENE_API_KEY`

Default base URL:

- `https://selemene.tryambakam.space`

## Local Storage Model

- Secret storage: Raycast local storage
- Cache database: `environment.supportPath/noesis-cache.sqlite`
- Cached resources:
  - service health and rate-limit snapshot
  - user profile
  - usage analytics
  - engine catalog
  - workflow catalog plus engine membership
  - recent readings and reading stats
  - menu bar pulse insights for Vedic Clock, biorhythm, and Vimshottari

## Brand Frame

Tryambakam Noesis is a practice platform for self-consciousness. It does not sell AI as a feature and does not promise transformation timelines. The extension is built around one practical posture: surface the active pattern, keep the practitioner in authorship, and let the engine remain infrastructure.

The governing product language is Kha-Ba-La:

- `Kha` - observer, witness, author-drive
- `Ba` - body, vehicle, embodiment
- `La` - inertia, resistance, the material that gives form to practice

## Development

```bash
PATH=/opt/homebrew/bin:$PATH npm install
PATH=/opt/homebrew/bin:$PATH npm run dev
```

## Verification

```bash
PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit
PATH=/opt/homebrew/bin:$PATH npm run lint
PATH=/opt/homebrew/bin:$PATH npm run build
```
