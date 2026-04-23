# Noesis Raycast Upgrade Plan

Date: 2026-04-22

## Executive Summary

The current Raycast extension is healthy as a cached summary dashboard, but it stops at summary data. Engines, workflows, and readings all render through one shared action panel, so selecting an item only exposes refresh/preferences actions instead of the domain action the user expects. In practice:

- Engine rows do not start a new reading.
- Workflow rows do not execute a workflow.
- Reading rows do not open reading detail.
- Profile data is visible only indirectly through cached account summaries.
- Admin capabilities are not surfaced even though the backend exposes them and the operator has an admin API key.

The next pass should not patch this inside the existing dashboard list. The cleaner approach is to keep `Noesis Dashboard` as a hub and add dedicated commands/pages for engines, workflows, readings, profile, and admin operations.

## Hardened Raycast Constraints

Using the local `raycast-extension` and `raycast-ui-skills` references changes the implementation bar for this extension in a few important ways:

- Prefer multiple focused `view` commands over one oversized dashboard command.
- Prefer `List` with `isShowingDetail` plus `Action.Push` drill-ins over trying to simulate a custom web app inside Raycast.
- First paint should come from the local snapshot immediately, then revalidate asynchronously. Do not flash an empty screen while waiting for network refresh.
- Background freshness should come from the existing `no-view` sidecar pattern (`quickstats`) and menu bar cadence, not from aggressive polling loops inside interactive commands.
- Interactive commands should avoid blocking shell/file operations on the critical path. The current sqlite wrapper based on synchronous process execution is acceptable for correctness, but it is now a known UX-performance risk and should be refactored to async access or prewarmed cache reads.
- The visual language should stay Raycast-native: restrained iconography, metadata labels, concise markdown, deliberate sectioning, and clean focus-safe action panels. Do not build fake chrome.

## Verified Current Gap

### Raycast client

- `src/dashboard.tsx` currently routes every list item through the same `renderActions(onRefresh)` helper.
- That helper only exposes `Refresh Now`, `Open Onboarding`, and `Open Extension Preferences`.
- There is no engine execution form, no workflow execution form, and no reading detail page in the current command set.
- `src/lib/api.ts` only implements summary-style GET endpoints and does not expose calculate/execute/detail/admin mutation methods.
- `src/lib/types.ts` has summary/cache types, but not the richer request/response contracts needed for execution and admin management.

### Backend/API

The backend already exposes the required primitives for a deeper Raycast client. The problem is client coverage, not missing APIs.

## Endpoint Map

### User-mode endpoints

#### Service and account

- `GET /health/live`
- `GET /api/v1/status`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `GET /api/v1/users/me/usage`

#### Engines

- `GET /api/v1/engines`
- `GET /api/v1/engines/{engine_id}/info`
- `POST /api/v1/engines/{engine_id}/validate`
- `POST /api/v1/engines/{engine_id}/calculate`

#### Workflows

- `GET /api/v1/workflows`
- `GET /api/v1/workflows/{workflow_id}`
- `GET /api/v1/workflows/{workflow_id}/info`
- `POST /api/v1/workflows/{workflow_id}`
- `POST /api/v1/workflows/{workflow_id}/execute`

#### Readings

- `GET /api/v1/readings`
- `GET /api/v1/readings/{reading_id}`
- `GET /api/v1/readings/stats`

#### Auth and onboarding

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/onboarding/invite`
- `GET /api/v1/onboarding/invites`

### Admin endpoints

- `GET /api/v1/admin/session`
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/{user_id}/state`
- `PATCH /api/v1/admin/users/{user_id}/tier`
- `PUT /api/v1/admin/users/{user_id}/roles`
- `GET /api/v1/admin/api-keys`
- `POST /api/v1/admin/api-keys`
- `POST /api/v1/admin/api-keys/{key_id}/revoke`
- `POST /api/v1/admin/api-keys/{key_id}/rotate`
- `DELETE /api/v1/admin/api-keys/{key_id}`

## Important Contract Notes

### Engine/workflow input shape

The engine and workflow docs share the same core input contract:

- `birth_data`
- `current_time`
- `precision`
- `options`

If the user profile already stores birth data, the backend can auto-populate parts of the request. Raycast should still support explicit overrides in the execution form because:

- not every user profile is complete
- some readings are exploratory and should be run against alternate data
- admin/test operators may run calculations for diagnostics

### Docs/backend drift

There is documentation that references `GET /api/v1/users/me/api-keys`, but the current backend router does not expose that route. The Raycast plan should treat that endpoint as unavailable until the backend is updated or the docs are corrected.

### Invitation model

The extension should distinguish three different concepts:

1. Human account creation
   - uses `POST /api/v1/auth/register` or Discord OAuth
   - this is the path for a new end user
2. OpenClaw onboarding invites
   - uses `POST /api/v1/onboarding/invite`
   - this is a specialized invite path, not a generic user-admin flow
3. Machine/API credentials
   - uses the admin API key endpoints
   - this creates or rotates keys, but it does not create a human user account by itself

This distinction matters because "invite someone" and "issue an API key" are not interchangeable operations.

## Recommended Raycast Architecture

### Keep the dashboard as a hub

`Noesis Dashboard` should remain a summary command for:

- service health
- account snapshot
- usage snapshot
- recently used engines/workflows
- recent readings
- quick navigation into deeper commands

It should stop pretending to be the full product surface.

The dashboard should become a command center, not a mega-list:

- a top "Explore" section that routes to Engines, Workflows, and Readings
- a compact "Status" section for sync/account/service
- a "Recent Activity" section for readings and high-signal workflow/engine shortcuts
- right-hand detail panes for every major row so the UI feels rich before a push navigation happens

### Add dedicated commands

Recommended new commands:

- `Noesis Engines`
- `Noesis Workflows`
- `Noesis Readings`
- `Noesis Profile`
- `Noesis Admin`
- `Noesis API Keys` or `Noesis Admin Keys`

Optional later commands:

- `Noesis Users` if admin user management becomes large enough to merit its own surface
- `Noesis Invites` if OpenClaw onboarding invites are operationally important
- `Noesis History Sync` if the admin backend feature is needed in Raycast

### Recommended page flow

#### Engines flow

`Noesis Engines`
-> engine list
-> right-hand detail preview (`List isShowingDetail`)
-> engine detail page
-> `New Reading` action
-> execution form
-> result page
-> optional save/open reading detail

Each engine row should expose:

- `New Reading`
- `View Engine Info`
- `Copy Engine ID`
- `Refresh Engine Metadata`

#### Workflows flow

`Noesis Workflows`
-> workflow list
-> right-hand detail preview (`List isShowingDetail`)
-> workflow detail page
-> `Run Workflow`
-> execution form
-> result page with engine outputs and synthesis

Each workflow row should expose:

- `Run Workflow`
- `View Workflow Info`
- `Copy Workflow ID`
- `Refresh Workflow Metadata`

#### Readings flow

`Noesis Readings`
-> readings history list
-> right-hand detail preview (`List isShowingDetail`)
-> reading detail
-> rerun same engine/workflow with prior inputs when feasible

Each reading row should expose:

- `Open Reading`
- `Run Again` when the source engine/workflow is known
- `Copy Reading ID`
- `Open Engine` or `Open Workflow`

#### Profile flow

`Noesis Profile`
-> current profile
-> edit birth data, timezone, preferences
-> save via `PATCH /api/v1/users/me`

This is the right place to reduce friction for engine runs. Saving birth location/time once is higher leverage than asking for everything on every calculation.

#### Admin flow

`Noesis Admin`
-> admin session/capability check
-> shortcuts to:
  - users
  - API keys
  - system/admin utilities later

`Noesis API Keys`
-> list keys
-> create/revoke/rotate/delete
-> show one-time secret only at creation/rotation time

## Proposed Client Modules

### Commands/pages

- `src/engines.tsx`
- `src/workflows.tsx`
- `src/readings.tsx`
- `src/profile.tsx`
- `src/admin.tsx`
- `src/admin-api-keys.tsx`

### Shared components

- `src/components/engine-run-form.tsx`
- `src/components/workflow-run-form.tsx`
- `src/components/reading-detail.tsx`
- `src/components/profile-form.tsx`
- `src/components/admin-api-key-form.tsx`
- `src/components/admin-capability-gate.tsx`

### API/types

Expand:

- `src/lib/api.ts`
- `src/lib/types.ts`

Consider splitting if the file grows too large:

- `src/lib/api/user.ts`
- `src/lib/api/engines.ts`
- `src/lib/api/workflows.ts`
- `src/lib/api/readings.ts`
- `src/lib/api/admin.ts`
- `src/lib/types/admin.ts`
- `src/lib/types/execution.ts`

## Data and Cache Strategy

### What should stay cached in SQLite

- engine catalog
- workflow catalog
- profile snapshot
- usage snapshot
- recent readings list
- reading stats
- non-sensitive admin summaries if we decide the latency win is worth it

### What should not be persisted

- raw API key secrets returned from admin key creation/rotation
- login credentials
- one-time secret fragments that the backend only exposes once

### Cache separation

Keep user-mode cache and admin-mode cache logically separated even if they share one sqlite file. At minimum, use separate tables/namespaces and independent TTL rules so admin screens do not pollute the end-user dashboard state.

### Raycast load strategy

Every interactive command should follow the same load pattern:

1. synchronously show the most recent local snapshot-derived view model if available
2. run a single async revalidation pass
3. preserve previous data while refreshing
4. avoid interval-driven polling from the view command itself

This reduces perceived latency and avoids empty-state flicker.

The existing `Noesis Quick Stats` background command should remain the sidecar prewarmer for cache freshness. That is the Raycast-native place to schedule background work.

### Execution writes

A new engine/workflow execution should:

1. submit the run to the API
2. show the fresh result immediately
3. revalidate the readings list and stats in the background
4. avoid broad cache invalidation that causes unrelated dashboard churn

## Permissions and Capability Gating

Admin screens should never assume that the supplied API key has full admin permissions. First call `GET /api/v1/admin/session` and gate actions based on returned capabilities/roles.

Practical rules:

- hide admin commands entirely when the key is non-admin
- show read-only admin lists when the capability allows list but not mutate
- require explicit confirmation for revoke/rotate/delete
- label destructive actions clearly because key rotation is operational, not cosmetic

## Raycast UI Language

The UI should feel strong without pretending Raycast is a web canvas:

- use section titles with clear intent: `Explore`, `Status`, `Recent Readings`, `Active Workflows`
- use accessories sparingly and move richer context into detail metadata
- use `Detail` and `List.Item.Detail` markdown to create atmosphere and hierarchy, not to dump raw JSON first
- group engines by phase, workflows by composition/complexity, and readings by recency
- keep the action panel shallow and explicit; the primary action on a row must match what Enter should do
- reserve destructive emphasis for admin revoke/rotate/delete flows only

This is how the extension can feel "kick ass" while still reading as a native Raycast tool.

## Phased Delivery Plan

### Phase 0: Harden Raycast foundations

Goal:

- make the extension feel instant and native before expanding the surface area

Work:

- remove interactive polling loops from `view` commands
- standardize on instant cached render plus one async revalidation pass
- keep `quickstats` as the background sidecar
- identify and, if needed, replace sync sqlite process execution on hot UI paths

Acceptance:

- opening a command does not flash empty unnecessarily
- selection changes stay responsive while data refreshes
- background freshness remains available without UI polling loops

### Phase 1: Fix the navigation model

Goal:

- stop using the dashboard as the only interaction surface

Work:

- add dedicated `Engines`, `Workflows`, and `Readings` commands
- change dashboard row actions to deep-link into those commands/pages
- add detail pages for engines, workflows, and readings

Acceptance:

- selecting an engine no longer just refreshes
- selecting a workflow no longer just refreshes
- selecting a reading opens actual detail

### Phase 2: Add execution flows

Goal:

- make the extension operational, not just observational

Work:

- implement engine execution form wired to `POST /api/v1/engines/{engine_id}/calculate`
- implement workflow execution form wired to `POST /api/v1/workflows/{workflow_id}/execute`
- support re-run from prior reading context when the payload is reconstructable

Acceptance:

- a user can start a fresh reading from Raycast
- a workflow can be executed from Raycast
- successful runs appear in history after refresh/revalidation

### Phase 3: Add profile editing

Goal:

- reduce repeated data entry and improve calculation quality

Work:

- surface `GET /api/v1/users/me`
- edit and persist birth date/time/location/timezone/preferences through `PATCH /api/v1/users/me`

Acceptance:

- profile updates round-trip correctly
- subsequent engine runs can reuse stored birth data

### Phase 4: Add admin API key management

Goal:

- support operator workflows from Raycast

Work:

- `GET /api/v1/admin/session`
- `GET /api/v1/admin/api-keys`
- `POST /api/v1/admin/api-keys`
- revoke/rotate/delete flows
- one-time secret handling with copy-to-clipboard action and no sqlite persistence

Acceptance:

- admin operators can create and rotate keys safely
- the one-time secret is shown once and never stored locally
- non-admin keys cannot reach mutating admin actions

### Phase 5: Add admin user and invite tooling

Goal:

- support controlled operational tasks without overreaching the backend contract

Work:

- `GET /api/v1/admin/users`
- user state/tier/role updates
- optional OpenClaw invite management if that is operationally needed

Acceptance:

- admin user management is mapped to real backend permissions
- the UI does not imply a generic "create user" admin flow when none exists

## Testing and Verification Plan

### API client tests

Add focused tests for:

- engine execution request/response mapping
- workflow execution mapping
- reading detail mapping
- profile patch mapping
- admin session and admin API key mutations
- permission/capability error handling

### Command-level verification

Verify manually in Raycast:

- cold start with cache present: list renders immediately without an empty flash
- command open during revalidation: selection and scrolling stay responsive
- engine list -> new reading -> result
- workflow list -> execute -> result
- readings list -> reading detail
- profile edit -> save -> reload
- admin session with non-admin key
- admin session with admin key
- create API key -> copy secret -> confirm no secret is persisted

### Regression guardrails

- continue `tsc --noEmit`
- keep focused node tests for API and cache modules
- verify Raycast log stays clean after command launches
- watch for sqlite lock regressions when command count increases

## Risks

- More commands increase concurrent cache access, so the sqlite wrapper must stay conservative.
- Admin key secrets are security-sensitive; accidental persistence would be a serious bug.
- Docs/backend drift can mislead implementation if we trust docs over handlers.
- If engine/workflow payloads vary more than the shared docs suggest, the forms may need per-engine options earlier than expected.
- The current synchronous sqlite process wrapper may cause small UI freezes during interactive refreshes, even if the data model is correct.

## Recommended Implementation Order

1. Harden the Raycast load model and remove view-command polling.
2. Separate navigation surfaces from the dashboard using dedicated commands and `Action.Push` drill-ins.
3. Implement engines detail and readings detail because they resolve the most visible broken navigation expectations.
4. Implement engine execution.
5. Implement workflows.
6. Implement profile editing.
7. Implement admin session and API key management.
8. Implement admin users and invite tooling only after the core operator flows are stable.

## Bottom Line

The current extension is a functioning cache-backed observer. The next upgrade should turn it into an actual client by giving engines, workflows, and readings first-class pages and wiring them to the execution endpoints that already exist. Admin API key management is also feasible now, but it should be treated as an operator surface with strict capability checks and careful secret handling, not as a substitute for human-user onboarding.
