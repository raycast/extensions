# Greenhouse Raycast Extension - Plan

## Goals
- Provide a fast, keyboard-first view of Greenhouse jobs and applicant pipeline stages.
- Keep navigation native to Raycast (push/pop), with Enter opening the most relevant action.
- Start with read-only Harvest endpoints and build toward richer views later.

## Proposed UX (MVP)
1. Open Raycast, run **Greenhouse** command.
2. Root list shows default entries (for now):
   - Jobs (pushes to list of open jobs)
   - Candidates (optional later)
3. Jobs list:
   - Each item shows job name and status (open/closed/draft).
   - Primary action: **Show Pipeline** (push).
4. Job pipeline view (List with sections):
   - Sections = job stages (e.g., Application Review, Phone Screen, Offer).
   - Items = applicants in that stage.
   - Accessory = days since last activity (or applied date) for quick aging signal.
   - Primary action: **Open Applicant in Browser**.
5. Esc/back uses Raycast navigation stack automatically.

Notes:
- Raycast UI guidelines recommend using the Navigation API for push/pop navigation and not building a custom navigation stack.
- Action naming should follow Title Case and use Action Panel.

## Commands (Raycast)
- `Greenhouse` (root command, List):
  - Section: Shortcuts
    - Jobs -> pushes `JobsList` screen
    - (Later) Candidates -> pushes `CandidatesList` screen
- `JobsList` (List):
  - Fetch open jobs via Harvest, paginate if needed.
  - Action.Push to `JobPipeline`.
- `JobPipeline` (List with sections):
  - Fetch stages and applications for the selected job.
  - Group applications by `current_stage.id`.
  - Fetch candidate names for display.
  - Primary action opens applicant URL in browser.

## Data + API Endpoints (Harvest v1)
- Jobs:
  - `GET /jobs` (query: `status=open`, pagination)
- Job stages:
  - `GET /jobs/{id}/stages` or `GET /job_stages`
- Applications for a job:
  - `GET /applications?job_id={id}&status=active`
- Candidate details (for names):
  - `GET /candidates?candidate_ids=1,2,3` (batch in groups of 50)

## Applicant URL
- Use Greenhouse candidate/app URLs in this format:
  - `https://app.greenhouse.io/people/{candidate_id}?application_id={application_id}`

## “Days” Metric
- Prefer `last_activity_at` from application payload to compute days since last activity.
- Fallback to `applied_at` if no last activity.
- Later upgrade: use Activity Feed for exact stage-entry timestamps.

## Dependencies & Versions

**Always use the latest stable versions of all libraries and dependencies.**

Before installing or updating any package:
1. Use Perplexity to search for the current latest version
2. Use Perplexity to crawl official documentation for breaking changes
3. Check npm for actual latest: `npm view <package> version`

Key dependencies to verify:
- `@raycast/api` - latest Raycast API
- `typescript` - latest stable
- `vitest` or `jest` - latest for testing
- Any other packages added

When in doubt, crawl the official docs to confirm API compatibility.

## Client Integration
- Copied the existing Harvest client into this repo at:
  - `greenhouse-client/src/harvest-client.js`
- Options:
  1) Adapt the existing client into TypeScript in `src/api/harvest.ts` and reuse its pagination + auth logic.
  2) Keep the JS file and enable `allowJs` in `tsconfig` for use inside Raycast commands.
- Use Raycast preferences for `GREENHOUSE_HARVEST_API_KEY` (required) and optional base URL.

## Error Handling + UX
- Show a loading indicator while fetching.
- Use List.EmptyView with a helpful message when data is empty.
- Catch rate-limit or auth errors and show `showToast` with actionable messaging.

## Testing Plan (TDD)
Raycast docs emphasize running `npm run build` and `npm run lint` before submission; they do not prescribe a testing framework. We will add unit tests for the data layer and view-model logic.

- Unit tests (vitest or jest):
  - `parseNextLink` behavior
  - pagination assembly
  - application -> stage grouping
  - candidate batching (50 max)
  - days-since calculation
- Integration-ish tests with mocked `fetch`:
  - happy path for Jobs list
  - job pipeline with stages + apps + candidates
- CI/checks (local):
  - `npm run lint`
  - `npm run build`

## Implementation Steps
1. Scaffold Raycast extension structure (package.json, raycast.json, src/).
2. Add preferences for Harvest API key.
3. Convert or wrap Harvest client for Raycast usage.
4. Build `Greenhouse` root command.
5. Build `JobsList` command (pagination + search).
6. Build `JobPipeline` view (stages, applicants, days, open in browser).
7. Add tests + fixtures for API responses and view-model transformations.
8. Validate UX details (navigation titles, action naming, empty states).

## Status (Current)
- Steps 1-6 and 8 are implemented.
- Step 7 is partial: unit tests exist for pagination and pipeline utils, but no integration-style fetch tests yet.

## Fixes / Next Steps
- Treat empty `harvestBaseUrl` preference as unset to avoid invalid URL crashes.
- Filter pipeline applications to `status=active` to match Harvest behavior.
- Include `application_id` in candidate deep links for multi-application candidates.
- Add fetch-mocked tests for jobs + pipeline flows.

## References
- Raycast UI/UX guidelines and navigation guidance:
  - https://developers.raycast.com/basics/prepare-an-extension-for-store
- Raycast List component:
  - https://developers.raycast.com/api-reference/user-interface/list
- Raycast extension guidelines:
  - https://manual.raycast.com/extensions
- Greenhouse Harvest API (v1):
  - https://developers.greenhouse.io/harvest.html
