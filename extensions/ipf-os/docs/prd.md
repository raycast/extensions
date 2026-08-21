# Product Requirements Document — iPF OS Raycast Extension

| | |
| --- | --- |
| **Version** | 1.0 |
| **Status** | **LOCKED** for v1 |
| **Locked on** | 2026-08-20 |
| **Scope** | Internal ticketing only |
| **Change control** | Locked requirements do not change within v1. Amendments require a new version and explicit acceptance. Open items in §11 are the only decisions still outstanding. |

---

## 1. Problem & Objective

Switching between active work and the browser-based internal ticketing system introduces context switching and friction. This extension provides a keyboard-driven interface inside Raycast to view, create, and transition internal tickets, reusing the same Google Workspace identity staff already use on the web app.

## 2. Personas & Use Cases

- **Engineers & PMs** — quick triage, status updates during standups and code review, rapid bug capture without opening a browser tab.
- **Internal IT / Support** — searching assigned queues and logging ad-hoc requests by keyboard.

---

## 3. Decision Record

These are locked. Each was verified against service source, not documentation.

**D1 — Authentication uses a browser handoff through the web app, not a direct Google flow from the extension.**
The extension never contacts Google. It opens the web app, which authenticates the user through its existing Google Workspace login, then returns a one-time code to Raycast over PKCE. Rationale in §6.

**D2 — Priority is never a client input.**
The server derives priority from `dueDate`. The create form exposes a due-date picker and a read-only derived-priority preview. Unknown request fields are silently stripped, so sending `priority` would appear to succeed while being ignored.

**D3 — The ticket status model has four states and no reopen path.**
`OPEN`, `IN_PROGRESS`, `CLOSED`, `BLOCKED`. There is no `RESOLVED`, no `IN_REVIEW`, and no `REOPENED`. Review is a separate verdict (`VERIFIED` / `REJECTED`) applied to an already-closed ticket, not a status.

**D4 — Routing is by department, optionally project and sprint. There is no "component/team" concept.**
`owningDepartmentId` is required on create.

**D5 — The extension resolves display names client-side.**
Ticket payloads carry bare UUIDs for every person and department. Users and departments are prefetched and cached.

**D6 — v1 ships ticketing only.**
The `view-meal-plan` command currently in the manifest has no backing API and is removed from v1 (§11, O1).

**D7 — Service DTOs are the contract source of truth.**
`docs/design/api-spec.yml` and the tickets E2E runbook in the backend repo are both materially wrong and are not used for client generation.

**D8 — v1 development authenticates with email and password; Google sign-in is deferred.**
Password login satisfies F1 temporarily so the ticketing surface can be built and
tested before P1 and P2 land. It sits behind an `AuthProvider` interface, and the
browser handoff of section 6 will be a second implementation of that interface —
no command code changes when it lands.

Note that `/auth/local/login` is opt-in per user (`allowsLocalAuth`, set when a
user is invited as temporary staff); Google-first staff cannot use it. Development
therefore runs as the fallback admin via `/auth/admin/login`, plus a provisioned
local-auth staff user. Both are needed: an `ADMIN` token short-circuits every
per-ticket permission check, so the action gating in F5 is only meaningfully
verified as the staff user.

This decision is scoped to development. Shipping to staff still requires the
handoff, because most staff have no password at all.

### What changed from the pre-lock draft

The draft specified direct Google OAuth from the extension, a priority field on the create form, an `In Progress → In Review` transition, and a "Component/Team" input. All four contradict the implemented API and have been corrected above.

---

## 4. Scope

### In scope for v1

| # | Capability | Notes |
| --- | --- | --- |
| F1 | **Connect account** | Browser handoff, token cached, silent refresh. §6 |
| F2 | **Search Tickets** | List, filter, search, sort, paginate. §5.1 |
| F3 | **Ticket detail** | Metadata, participants, comments, audit timeline. §5.2 |
| F4 | **Create ticket** | With derived-priority preview. §5.3 |
| F5 | **Inline actions** | Start, close, comment, reassign, review. §5.4 |
| F6 | **Deep link** | Open the ticket in the web app. §5.5 |

### Explicitly out of scope for v1

| Capability | Reason |
| --- | --- |
| Notifications inbox / unread badge | Contract gap: the notifications consumer silently drops `REVIEW_REQUESTED`, `VERIFIED`, `REJECTED`, `BLOCKED`, `UNBLOCKED`. A notifications view would be misleading in exactly the cases users care about. Revisit once the consumer enum is aligned. |
| Attachment upload | Presigned URLs are currently minted against `localhost:9000`; delivery is unreliable outside the Docker host. |
| Escalations, department backlog | No API exists. These screens are client-side mocks in the web app. |
| Meals, HR | Services are unimplemented stubs. |
| Blockers, relatives, continuations, sprint close | Supported by the API but not required for the v1 workflow. |
| SLA policy administration | Not routed through the gateway. |

---

## 5. Functional Requirements

### 5.1 Search Tickets (F2)

Because the API applies **no server-side read scoping**, a personal view must be constructed explicitly from filters using the authenticated user's UUID.

- Scope names and filters mirror the web app's listing tabs so the same words mean the same thing on both surfaces: **Watching** (`participantUserId = <me>`, the default), **Assigned to Me** (`assignedUserId = <me>`), **My Tickets** (`creatorUserId = <me>`), and **All Tickets** (unfiltered). The command is named Search Tickets rather than My Tickets to avoid colliding with the scope of that name.
- Filter by status, priority, type, and department.
- Search via the `search` query parameter (case-insensitive substring over ticket number, title, description; no relevance ranking).
- Sort via `sortBy` and `sortOrder`.
- Paginate with `currentPage` and `pageSize` (max 100).
- List rows must not render a created date — the ticket payload omits `createdAt` and `updatedAt`.
- List rows must not rely on `owningDepartment`; it is populated only on single-ticket fetch. Use the cached department map.

### 5.2 Ticket detail (F3)

Displays ticket metadata, resolved participant names and roles, comments, and the action timeline. Because review and block events never reach the notifications API, the timeline and `closedBadge` are the authoritative in-app signal for those state changes.

### 5.3 Create ticket (F4)

| Field | Required | Notes |
| --- | --- | --- |
| Title | Yes | |
| Description | Yes | |
| Type | Yes | One of 9 enum values |
| Department | Yes | Picker, from cached departments |
| Assignee | No | Picker; omitting it lets the server auto-route |
| Project | No | |
| Sprint | No | Requires a project. Strict validation — see §9. |
| Due date | No | Drives derived priority |
| Needs response | No | Boolean |

The form shows a **read-only** derived priority computed client-side from the due date using the SLA windows (`CRITICAL` ≤ 4h, `HIGH` ≤ 24h, `MEDIUM` ≤ 72h, otherwise `NORMAL`; no due date yields `NORMAL`). The form must reject past-dated due dates, which would otherwise compute as `CRITICAL` and be immediately SLA-breached.

### 5.4 Inline actions (F5)

Actions are shown or hidden by porting the web app's permission matrix (`resolveTicketActionPermissions`), which mirrors the server's per-ticket authorization. Client-side gating is a UX affordance only; the server remains authoritative and its error `message` is surfaced verbatim in the failure toast.

Valid transitions: `OPEN → IN_PROGRESS` (assignee or admin); `OPEN → CLOSED` and `IN_PROGRESS → CLOSED` (per the permission matrix). `CLOSED` is terminal. `BLOCKED` cannot be changed directly. Review accepts `VERIFIED` or `REJECTED` only, on a ticket that is `CLOSED` with badge `UNVERIFIED`.

Note that an assignee's first comment on an `OPEN` ticket auto-starts it server-side; the UI must reflect the returned state rather than assume the ticket is unchanged.

### 5.5 Deep link (F6)

`Cmd + Enter` opens the ticket in the web app. URL pattern pending confirmation (§11, O2).

---

## 6. Authentication Design (F1)

**Decision D1.** The extension authenticates by handing off to the web app, which already performs Google Workspace sign-in. The extension itself has no Google client, no Google configuration, and no Google credentials.

### Flow

1. User runs any command while unauthenticated and chooses **Connect to iPF OS**.
2. Raycast generates a PKCE verifier and `state`, then opens the web app's connect route in the browser.
3. If the user has no active session, the web app runs its normal Google login. If a session exists, this step is skipped.
4. The web app presents an explicit **approve** screen naming Raycast as the client.
5. On approval the web app requests a one-time code from the auth service, bound to the PKCE challenge.
6. The browser redirects back into Raycast with the code and `state`.
7. Raycast validates `state`, exchanges code plus verifier for a fresh token pair, and shows a success toast.

### Security requirements

These are mandatory, not advisory.

- **PKCE S256.** The verifier never leaves the extension.
- **One-time code.** Single use, ≤60 second TTL, stored hashed, bound to the PKCE challenge.
- **Explicit approval screen.** Prevents a drive-by request from silently linking an account.
- **`state` validation** on return.
- **Fresh token pair**, recorded as a distinct Raycast session so it can be revoked independently of the user's web session. The web session's own token is never handed to the extension.
- **Domain restriction** remains enforced server-side by the Google hosted-domain check.
- **No client secrets** in the extension bundle.

### Why not authenticate to Google directly

The web app uses the OAuth **implicit** flow (`response_type=id_token`), so Google returns the credential in the URL **fragment**. Fragments are not delivered to servers, and Raycast's OAuth redirect handles query parameters from the authorization-code flow. Replicating the web flow would therefore require a hosted fragment-capture page — the same web page the handoff needs — plus a new registered Google redirect URI and a duplicated client configuration, while extending an implicit-flow credential to a desktop client. It is more work and a weaker security posture.

### Token handling

Access tokens last 7 days, refresh tokens 30. The extension attempts the call, refreshes on `401`, and re-prompts for connection only if the refresh also fails. Tokens are held in Raycast's encrypted credential storage.

---

## 7. Integration Contract

Full contract in the reviewed artifact. Load-bearing points for implementation:

- **Base URL:** `https://os.gateway.beagile.africa/api/v1` (production), `http://localhost:8080/api/v1` (local). Both require the `/api/v1` suffix; without it the gateway 404s. Note that `api.os.beagile.africa` is an unrelated service and is not the iPF OS gateway.
- **Web app:** `https://os.web.beagile.africa`, tickets at `/dashboard/ticketing/tickets/{id}`.
- **Every response is enveloped:** `{ status, message, timestamp, path, data }`.
- **Paginated responses put `data` and `pagination` at the top level as siblings** — not nested under `data`.
- **Errors** carry a machine-readable `code` and a user-presentable `message`; surface `message` directly.
- Client types are generated from service DTOs (D7).

---

## 8. Non-Functional Requirements

- **Perceived latency:** cached results render immediately on command open, with background revalidation. Fresh network fetch target under 1s on a warm connection.
- **Mutations:** optimistic UI with rollback on failure, and the server's error message shown in the toast.
- **Offline / unreachable backend:** commands degrade to a clear error state rather than an empty list.
- **Distribution:** Raycast for Teams private organization store.
- **Platforms:** see §11, O3.

---

## 9. Error Handling Requirements

| Condition | Required behaviour |
| --- | --- |
| `401` | Attempt refresh once, then prompt to reconnect |
| `403` | Show the server message; do not retry |
| `409` | Show the server message (these are workflow conflicts, e.g. closing a ticket that was never started) |
| `503` on create with a sprint | Sprint validation is strict and fails hard. Advise retry; do not silently drop the sprint. |
| Malformed UUID | Returns `400`, not `404` |
| `204` responses | Return no body; do not parse |

---

## 10. Dependencies & Prerequisites

**P1 — Blocking. The `POST /api/v1/auth/google/complete` authentication bypass must be fixed and deployed before F1 ships.**

The endpoint currently accepts an identity with no ID token and trusts caller-supplied `email`, `providerUserId`, and `hostedDomain`, issuing a genuine 7-day token for any existing staff account at the victim's privilege level. The endpoint is unauthenticated and the code path has no environment guard. A pending invitation can additionally be accepted without its emailed token.

This is a prerequisite rather than a related task: approach B's security rests on the web session being trustworthy, and the web session derives from this endpoint. Required fix — make `idToken` mandatory, remove the unverified fallback path, gate any test double behind a non-production profile, and verify the `nonce` on return.

**P2** — Auth service work for the one-time code endpoints, and a connect route plus approval screen in the web app.

---

## 11. Open Items

Locked requirements above do not depend on these, but each needs a decision before or during implementation.

| # | Item | Status | Needed for |
| --- | --- | --- | --- |
| O1 | Remove the `view-meal-plan` command from the manifest for v1 | **Resolved** — removed | Manifest cleanup |
| O2 | Confirm the web app origin and ticket URL pattern for deep links | **Resolved** — `https://os.web.beagile.africa`, path `/dashboard/ticketing/tickets/{id}` (both verified live) | F6 |
| O3 | The manifest declares both Windows and macOS. Confirm whether v1 targets macOS only. | Open — shortcuts declare macOS and Windows variants, so either answer works | Distribution |
| O4 | Whether a stopgap login ships for internal testing while P1 and P2 land | **Resolved** — see D8 | Sequencing |
| O5 | Confirm the security fix is verified against the deployed build, and that `AUTH_GOOGLE_ALLOWED_HOSTED_DOMAIN` is set in production | Open | P1 |
| O6 | `assets/extension-icon.png` is 100x100; the store requires 512x512 | Open — blocks `ray lint` and store submission, not development | Distribution |

---

## 12. Success Metrics

- Over 40% of ticket state transitions completed via Raycast within 60 days of launch.
- Median time to create a ticket drops by more than 50% versus the web UI.
- Zero authentication or token-leak incidents.
- Zero user-reported cases of the extension showing stale or incorrect ticket state.
