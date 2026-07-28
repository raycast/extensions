# PRD: Expiration Reminder Raycast Extension

**Status:** Draft
**Owner:** Product (Expiration Reminder)
**Last updated:** 2026-07-09
**Target repo (extension):** new standalone TypeScript/React project (Raycast store submission) — *not* part of `web-core`
**Backend consumed:** `ExpirationReminder.API` (net8.0 REST API), OAuth2 authorization-code grant

---

## 1. Product / Feature Name

**Expiration Reminder for Raycast** — a macOS Raycast extension that gives compliance and operations users fast, keyboard-driven access to their expiration/compliance data without opening the web app.

---

## 2. TL;DR

Compliance managers and ops admins live in "what's expiring and who owns it" mode all day, but every check means opening a browser, logging in, and navigating grids. This extension surfaces expired items, about-to-expire items, contacts, a contact's credentials, and document files directly inside Raycast — plus two quick-create commands (new expiration, new contact). It authenticates once via OAuth2 against the existing `ExpirationReminder.API`, caches tokens securely in Raycast, and reuses the REST endpoints the mobile and integration clients already use. The outcome: a 5-second glance at compliance status from anywhere on the desktop, and one-keystroke data entry.

---

## 3. Goals

### Business goals
- **Increase daily active engagement** with Expiration Reminder data by shipping a zero-friction desktop surface; target **+15% weekly active power users** (users touching data 5+ days/week) within **90 days** of GA.
- **Reduce time-to-answer** for "is X expired / expiring?" from a browser session (~30–60s) to **< 5s** in Raycast.
- **Create a new top-of-funnel channel** via the public Raycast Store listing; target **500 installs** in the first **90 days**.
- **Reduce support/onboarding load** for API/OAuth by proving a first-party OAuth client that dogfoods the public API surface.

### User goals
- See everything expired right now, sorted by urgency, in one keystroke.
- See everything expiring within a configurable window (default 30 days).
- Search expirations, contacts, and files by name from the launcher.
- Drill from a contact into that contact's credentials without leaving the keyboard.
- Create a new expiration or contact in seconds from a form command.
- Never re-authenticate manually during normal use (silent token refresh).

---

## 4. Non-Goals

- **No Blazor/Syncfusion work.** The UI is Raycast's own React component set. No web-app changes except the API/OAuth dependencies enumerated in §16.
- **No new permission model.** The extension inherits exactly the permissions of the OAuth-connected user via the existing `AuthorizationManager` / `OAuthClientConnection` flow.
- **No offline mode / local database.** All reads/writes go to the live API; only tokens and light caches are stored on-device.
- **No bulk operations, no editing/deleting** of items in v1 (create + read only). Renew/edit/delete are P2 candidates.
- **No Windows/Linux support.** Raycast is macOS-only; this is inherent.
- **No file *content* viewing/download** in v1 beyond metadata + "Open in Web App." (Attachments carry a `content` blob but we will not render binaries in Raycast v1.)
- **No management of OAuth clients** — the Raycast client is a single pre-registered first-party app.
- **No push/real-time notifications.** Raycast commands are pull-on-invoke.

---

## 5. Personas & User Stories

### Persona A — Compliance Manager (Maria)
Owns audit readiness for a mid-size org; checks expirations many times a day.
1. As a compliance manager, I want to see all expired items instantly so I can triage overdue credentials.
2. As a compliance manager, I want items expiring in the next 30 days so I can chase renewals early.
3. As a compliance manager, I want to change the "expiring soon" window (7/30/60/90 days) so it matches my review cadence.
4. As a compliance manager, I want to search an expiration by name so I can confirm a specific credential's status.
5. As a compliance manager, I want to open any item in the web app from Raycast so I can take deeper action.
6. As a compliance manager, I want to copy an item's expiration date/details so I can paste into an email.

### Persona B — Operations Admin (Devin)
Manages contacts (employees, vendors) and their documents.
7. As an ops admin, I want to search contacts by name/email so I can find a person fast.
8. As an ops admin, I want to drill from a contact into their expirations so I can see everything they own.
9. As an ops admin, I want to create a new contact from Raycast so I can onboard someone without opening the app.
10. As an ops admin, I want to create a new expiration and attach it to a contact so I can log a credential immediately.
11. As an ops admin, I want to search files by name so I can locate a document quickly.

### Persona C — Account Admin (Priya)
Owns the org's integrations and connection security.
12. As an account admin, I want to connect the extension via OAuth once and trust it uses my permissions so access stays governed.
13. As an account admin, I want to disconnect/sign out from Raycast so I can revoke local access on a shared machine.
14. As an account admin, I want to point the extension at a specific API base URL (prod vs. sandbox) so I can test safely.

---

## 6. Functional Requirements (Prioritized)

Legend: **P0** = launch-blocking, **P1** = fast-follow, **P2** = later.

### 6.1 Authentication & Connection (P0)
- **P0** OAuth2 sign-in via Raycast `OAuth.PKCEClient`. On first protected command, the extension launches the authorize URL, the user consents in-browser, and Raycast captures the redirect.
- **P0** Token storage in Raycast's secure token store; silent refresh before expiry (access token TTL = 3600s per API).
- **P0** "Sign out" action (available in every command's `ActionPanel`) that clears stored tokens locally.
- **P1** Detect revoked/expired refresh token → prompt re-auth with a friendly toast, not a raw error.

> ✅ **Dependency resolved (G-1, 2026-07-18):** the backend now supports **PKCE public clients** — the token/refresh exchanges verify the S256 `code_verifier` and require **no** `client_secret`. The extension is a public client: `client_id` is baked in, no secret preference. (The old interim confidential-client mode — user-supplied `client_id`/`client_secret` in prefs — has been removed.)

### 6.2 Command: Show Expired Items (P0)
- **Type:** `view`.
- **Behavior:** lists all items already past expiration, sorted by most-overdue first.
- **API:** `GET /v1/expirationitems?status=expired&sort=expiration_date&sortDirection=asc&paging=100`.
- **Acceptance criteria:**
  1. Each row shows item name, category, expiration date, and days overdue.
  2. List is searchable in-place via Raycast's built-in list filter (client-side over the loaded page).
  3. Empty state renders "No expired items 🎉".
  4. `Enter` opens a Detail view; `⌘↵` opens the item in the web app.
- **Edge cases:** items with no expiration date are excluded (they are `status=nodate`, not `expired`); pagination beyond page 1 handled via §8.

### 6.3 Command: Show About-to-Expire Items (P0)
- **Type:** `view`.
- **Behavior:** lists items expiring within the configured window (default **30 days**), soonest first.
- **API:** `GET /v1/expirationitems?status=current&expiresWithinDays={windowDays}&sort=expiration_date&sortDirection=asc` — **server-side** date-window filter (G-2 shipped). Inclusive `[today, today+N]`, null-date items excluded, window computed against server UTC. No client-side filtering.
- **Acceptance criteria:**
  1. Only items with `expiration_date` between today and `today + windowDays` appear.
  2. The window respects the `defaultExpiryWindow` preference; a dropdown in the command's search-bar accessory lets the user override to 7/30/60/90 for the current session.
  3. Rows show name, category, expiration date, and days remaining (color/emoji accessory by urgency: 🔴 ≤7d, 🟠 ≤30d, 🟡 ≤window).
  4. Empty state: "Nothing expiring in the next N days".
- **Note:** timezone boundary is server UTC (per G-2); urgency accessories in the list still render in the user's local tz, a minor display nuance only.

### 6.4 Command: Search Expirations (P0)
- **Type:** `view`, with `onSearchTextChange` driving server queries (debounced 300ms).
- **API:** `GET /v1/expirationitems?term={q}&paging=50&sort=name`.
- **Acceptance criteria:**
  1. Typing ≥2 chars triggers a debounced server search; `<2` chars shows a hint.
  2. Results show name, category, status badge (current/expired/notifying), expiration date.
  3. `isLoading` spinner shows during fetch; stale responses are discarded (latest-wins).
  4. Actions: view Detail, open in web app, copy name, "Show this contact's expirations" is **not** here (that's the contact command).

### 6.5 Command: Search Contacts (P0)
- **Type:** `view`, `onSearchTextChange` (debounced 300ms).
- **API:** `GET /v1/contacts?term={q}&paging=50&sort=name` (email search via `email={q}` when the query looks like an email).
- **Acceptance criteria:**
  1. Results show name, email, phone (if present).
  2. Primary action: **"Show Expirations"** → pushes the Contact Expirations view (§6.6).
  3. Secondary actions: open contact in web app, copy email, copy phone.
  4. Empty/short-query states handled as in §6.4.

### 6.6 Command: Show a Contact's Expirations (P0)
- **Type:** `view` (typically pushed from §6.5, but also a standalone command that first asks for a contact via a search dropdown).
- **API:** `GET /v1/expirationitems/contact/{contactId}?page=1`.
- **Acceptance criteria:**
  1. Header/section shows the contact's name.
  2. Lists that contact's expiration items with the same row format and urgency accessories as §6.3.
  3. Empty state: "This contact has no expirations".
  4. Actions: view Detail, open item in web app, back to contact.

### 6.7 Command: Create an Expiration (P0)
- **Type:** `form` (`view` hosting a `Form`).
- **Inputs:** `name` (required text), `category` (dropdown — see below), `expiration_date` (`Form.DatePicker`, required), `details` (textarea), `contact` (optional searchable dropdown to associate), `team` (optional dropdown, P1).
- **APIs:**
  - Populate category dropdown: `GET /v1/categories`.
  - Populate contact dropdown (optional): `GET /v1/contacts?term={typed}` (async).
  - Submit: `POST /v1/expirationitems` with body `{ name, category: { id }, expiration_date: "yyyy-MM-dd", details, contact_id }`.
- **Acceptance criteria:**
  1. Submitting with valid inputs creates the item and shows a success toast with a "View in Web App" action.
  2. `expiration_date` is serialized as `yyyy-MM-dd` (API rejects other formats on renew; create parses via `ToDateTimeRemoveTime`).
  3. If `category` is omitted, the extension defaults to sending no category id and lets the API fall back to "Generic" (documented API behavior) — but the dropdown defaults to the org's categories so this is rare.
  4. Validation errors from the API (400) surface inline/as a toast with the API `message`.
  5. On success the form resets (or closes, per `popToRootOnSubmit` preference).
- **Edge cases:** category list empty → dropdown shows "Generic (default)"; contact search returns nothing → allow submit without a contact.

### 6.8 Command: Create a Contact (P0)
- **Type:** `form`.
- **Inputs:** `name` (required), `email` (required by model annotation), `mobile`, `phone`, `timezone` (dropdown, P1), `contact type` (dropdown via `GET /v1/contacttypes`, P1).
- **API:** `POST /v1/contacts` with `{ name, email, mobile, phone }`.
- **Acceptance criteria:**
  1. `name` and `email` required client-side before submit (mirrors API 400s: "Contact name can't be empty").
  2. Success toast with "Create an Expiration for this contact" follow-up action (pre-fills §6.7 with the new `contact_id`).
  3. Duplicate/existing-id conflicts (409) surfaced clearly.

### 6.9 Command: Search Files (P0)
- **Type:** `view`, `onSearchTextChange` (debounced 300ms).
- **API:** `GET /v1/attachments/search?term={q}&page=1&includeFileContent=false` — global cross-entity search (G-3 shipped).
- **Acceptance criteria:**
  1. Results show file name, content type (icon by type), created date, and the related entity type/id.
  2. **`includeFileContent=false` is always sent** to avoid pulling base64 blobs into Raycast (see §8, §11).
  3. Primary action: "Open Related Item in Web App"; secondary: copy file name.
  4. Empty/short-query states as in §6.4.
- **Scope:** searches attachments across **all entity types** (expiration items, contacts, locations, vehicles, equipment, companies), permission-scoped. Each result carries `entity_type` + `entity_id`; "Open Related Item" deep-links to the correct `/{entity_type}/view/{id}` page.

### 6.10 Detail View (P0, shared)
- **Type:** `Detail` reached from list commands.
- **Behavior:** markdown-rendered detail (name, category, status, expiration date, days remaining/overdue, details, associated contacts if present in the model), with a metadata sidebar (`Detail.Metadata`).
- **Actions:** open in web app, copy fields, back.

### 6.11 Cross-cutting (P0/P1)
- **P0** Every command's `ActionPanel` includes "Open in Web App", "Sign Out", and relevant copy actions.
- **P1** "Renew Expiration" action calling `POST /v1/expirationitems/{id}/renew` with a date picker.
- **P2** Menu-bar command showing a live count of expired + expiring-soon items (`MenuBarExtra`).
- **P2** Raycast AI tools / `@`-mention integration (quick-answer "how many expired?").

---

## 7. User Experience

### Entry points
- Raycast root search: users type command titles ("Show Expired Items", "Search Contacts", etc.) or configured aliases/hotkeys.
- First protected command triggers the OAuth consent flow automatically.

### Core flows
1. **Glance flow:** `⌘Space` → "expired" → list → arrow to item → `Enter` (Detail) or `⌘↵` (web app).
2. **Drill flow:** "Search Contacts" → type name → `Enter` on "Show Expirations" → contact's items.
3. **Create flow:** "Create an Expiration" → fill form → `⌘↵` submit → success toast → optional "View in Web App".

### Navigation model
- List-first (`List`) → push `Detail` or push nested `List` (contact → expirations) via Raycast's `useNavigation().push`.
- Forms via `Form` + `ActionPanel.SubmitForm`.

### Accessibility & platform conventions
- Full keyboard operation is native to Raycast; we add sensible `ActionPanel` shortcut keys (`⌘↵`, `⌘C`, `⌘⇧C`).
- Use standard Raycast list accessories, icons, and colors so system dark/light + accessibility settings are honored automatically.
- All destructive/auth actions use `Action.Style.Destructive` and `confirmAlert` where appropriate (Sign Out).

### Performance targets
- **p95 command open → first results rendered: < 1.2s** on a warm token (single API page, ≤100 rows).
- **p95 search keystroke → results: < 700ms** after the 300ms debounce (server round-trip).
- **Token refresh adds < 400ms** and only on refresh boundaries.

---

## 8. Advanced Features & Edge Cases

- **Pagination:** API pages are `paging`-sized (default 100, max 500; `ListModel` returns `total`, `pages`, `page`). v1 loads page 1 and, for list commands, supports "Load More" via Raycast `List` `pagination` prop when `page < pages`. Search commands cap at first 50 to stay snappy.
- **Debounce & latest-wins:** search commands debounce 300ms and discard out-of-order responses (track a request sequence id) to avoid flicker.
- **Blob avoidance:** the attachment endpoint defaults `includeFileContent=true`; the extension **must** pass `includeFileContent=false`. Never load `content` byte arrays into memory or the Raycast cache.
- **Date-window filtering** (about-to-expire) is done **server-side** via `expiresWithinDays` (G-2 shipped); the window is inclusive `[today, today+N]` computed against server UTC, null-date items excluded.
- **Category/contact dropdown caching:** cache `GET /v1/categories` and recent contact lookups for the session (Raycast `Cache`, short TTL, e.g., 10 min) to keep the create form instant. Never cache PII beyond the session.
- **Empty/short query guards** on all `onSearchTextChange` commands (min 2 chars).
- **Rate limiting / backoff:** treat HTTP 429 and 5xx with exponential backoff + jitter (max 3 retries) and a user-facing toast on final failure. Limits are now enforced + documented (G-4: ~120/min per token, 30/min per IP; `429` + seconds-integer `Retry-After`), which the client already honors.
- **Conflict handling:** create commands surface 409 (duplicate id) and 400 (validation) with the API `message`. Renew (P1) surfaces 404/400.
- **Clock skew / expiry:** refresh access token when within 60s of `expires_in`; on 401 mid-flight, refresh once and retry the request transparently.

---

## 9. Success Metrics

### User-centric
- **Time-to-answer** for expired/expiring lookups: **< 5s p50** (measured via command-open → results event).
- **Command adoption:** ≥ **60%** of connected users use ≥2 distinct commands within 30 days.
- **Create adoption:** ≥ **20%** of connected users create at least one item/contact from Raycast within 30 days.

### Business
- **500 store installs** and **200 successful OAuth connections** within 90 days of GA.
- **+15% weekly active power users** (defined in §3) within 90 days.

### Technical
- **p95 results latency < 1.2s** (list) / **< 700ms** (search, post-debounce).
- **OAuth connect success rate ≥ 95%** (successful token exchange / consent completions).
- **Command error rate < 1%** (excluding user-cancelled auth).
- **Silent-refresh success ≥ 99%.**

---

## 10. Tracking Plan (Analytics/Events)

Raycast extensions can't run arbitrary analytics SDKs freely; use a lightweight first-party telemetry ping to an existing endpoint (or PostHog via a minimal proxy) **only with user opt-in** (a preference). Event schema:

- `extension_installed` (version)
- `oauth_connect_started` / `oauth_connect_completed` / `oauth_connect_failed` (reason)
- `token_refreshed` / `token_refresh_failed`
- `command_opened` (command_name)
- `list_viewed` (command_name, result_count, page)
- `search_executed` (command_name, query_length, result_count, latency_ms)
- `item_created` (has_contact, has_category)
- `contact_created`
- `detail_viewed` (entity_type)
- `open_in_web_app` (entity_type)
- `error_occurred` (command_name, http_status, code)
- `signed_out`

Privacy: never log query text or PII — only lengths/counts. Telemetry defaults **off**; controlled by a preference (§13).

---

## 11. Technical Considerations

### Architecture
- **Client type:** Raycast extension, TypeScript + React, `@raycast/api` + `@raycast/utils`.
- **No direct Core/Domain access.** All data via `ExpirationReminder.API` REST over HTTPS. This overrides the usual "no API endpoints in PRDs" rule per the brief — the extension is an external client and the API surface is a hard dependency.
- **HTTP layer:** a single `apiClient` wrapper (fetch + `useFetch` from `@raycast/utils` for view commands) that injects `Authorization: Bearer {accessToken}`, handles refresh-on-401, base-URL resolution, and error normalization.

### OAuth2 configuration & token lifecycle
- **Preferred flow:** Authorization Code + **PKCE** using Raycast `OAuth.PKCEClient` with `redirectMethod: OAuth.RedirectMethod.Web` (or `AppURI`), `providerName: "Expiration Reminder"`.
  - **Authorize URL:** `{webBaseUrl}/oauth/authorize?client_id={clientId}&response_type=code&redirect_uri={raycastRedirect}&state={state}&code_challenge={challenge}&code_challenge_method=S256`.
  - **Consent step** is served by the Blazor app at `Components/Pages/OAuth/Authorize.razor`; the `POST /oauth/authorize` handler issues a one-time **authorization code (GUID, TTL 1 minute)** and redirects to `redirect_uri?code=...&state=...`.
  - **Token exchange:** `POST {apiBaseUrl}/oauth/token` (OAuthController) with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `code_verifier` — **no `client_secret`** (public client). Response: `{ access_token, token_type: "bearer", expires_in: "3600", refresh_token, scope, state }`. **Note:** `access_token` and `refresh_token` are GUIDs, and the Bearer token *is* the `OAuthAccessToken` id.
  - **Refresh:** `POST {apiBaseUrl}/oauth/token` with `grant_type=refresh_token`, `refresh_token`, `client_id` (no secret, no `code_verifier` on refresh).
- **Token storage:** `PKCEClient.setTokens` / `getTokens` (Raycast-encrypted). Refresh proactively at `expires_in - 60s` and reactively on any 401.
- **Public client (G-1 shipped):** the extension is a PKCE public client — `client_id` is a baked-in constant (`src/oauth/client.ts` `PUBLIC_CLIENT_ID`), no `client_secret` is ever sent. The prior interim confidential-client mode (user-supplied `client_id`/`client_secret` in prefs) has been removed.

### Security
- No `client_secret` in source or preferences — the public client authenticates via PKCE (S256 `code_verifier`).
- All traffic HTTPS; the API enforces a secure-connection filter (`RequireSecureConnectionFilter`).
- "Sign Out" revokes the token server-side via `POST /oauth/revoke` (G-5, best-effort) and then clears local tokens.

### Reliability
- Exponential backoff + jitter (max 3) on 429/5xx; single silent retry after refresh on 401.
- Latest-wins request sequencing on search.
- Structured client-side error mapping: 401→re-auth, 403→"you don't have permission", 404→"not found", 400/409→show API `message`, network→"couldn't reach Expiration Reminder".

### Extension preferences (see §13)
- Configurable API base URL and web base URL (prod/sandbox), default expiry window, page size, telemetry opt-in. No `client_id`/`client_secret` prefs (public client; `client_id` baked in).

### Constraints from the backend (verified in code)
- Default page size `Constants.Paging = 100`; `paging` param capped at 500.
- Status filter values: `current`, `expired`, `notifying`, `archived`, `nodate`, `missing`.
- Expiration `Get` list supports `term`, `page`, `status`, `sort`, `sortDirection`, `paging`.
- Contact list supports `term`, `email`, `page`, `sort`, `sortDirection`, `paging`.
- Global attachment search (`/v1/attachments/search`) spans all entity types, permission-scoped, and defaults `includeFileContent=false`. (The expiration-item-only `/v1/attachments/expirationitem` endpoint still exists.)

---

## 12. Linear Issues (Sample Backlog)

> Team: Engineering (ENG). Extension work is a new TS repo; backend items target `ExpirationReminder.API` / Blazor OAuth.

1. **[Extension] Project scaffold + apiClient + preferences** — Set up Raycast TS project, shared `apiClient` (base URL, bearer injection, error mapping), and preference schema. *Out of scope:* any command UI.
2. **[Extension][P0] OAuth PKCE connect + token lifecycle** — Implement `OAuth.PKCEClient`, authorize/token/refresh, secure storage, refresh-on-401, Sign Out. *AC:* first protected command triggers consent; silent refresh works; sign-out clears tokens. *Depends on:* Backend G-1.
3. **[Extension][P0] Command: Show Expired Items** — `status=expired`, sorted, urgency accessories, Detail + web-app actions.
4. **[Extension][P0] Command: Show About-to-Expire Items** — `status=current` + client-side window filter; window dropdown; preference-driven default.
5. **[Extension][P0] Command: Search Expirations** — debounced server search, latest-wins, loading state.
6. **[Extension][P0] Command: Search Contacts** — debounced search; "Show Expirations" push action.
7. **[Extension][P0] Command: Show a Contact's Expirations** — `/expirationitems/contact/{id}`; standalone contact picker + pushed variant.
8. **[Extension][P0] Command: Create an Expiration (form)** — category + optional contact dropdowns; `yyyy-MM-dd`; success toast + follow-ups.
9. **[Extension][P0] Command: Create a Contact (form)** — required name/email; 409/400 handling; follow-up "create expiration".
10. **[Extension][P0] Command: Search Files** — `includeFileContent=false`; type icons; open related item. Global cross-entity search via `/v1/attachments/search` (G-3 shipped); deep-links per entity type.
11. **[Extension][P0] Shared Detail view + ActionPanels** — markdown detail, metadata sidebar, copy/open actions.
12. **[Extension][P1] Pagination "Load More" + backoff/retry** — Raycast list pagination; 429/5xx backoff; error toasts.
13. **[Extension][P1] Telemetry (opt-in)** — event schema from §10; preference gate; no PII.
14. **[Backend][P0] G-1: PKCE support on authorize + token** — accept `code_challenge`/`code_challenge_method` at `/oauth/authorize`, persist on the auth code, verify `code_verifier` at `/oauth/token`; allow public clients (no secret). *AC:* S256 verified; secretless exchange succeeds only with valid verifier.
15. **[Backend][P1] G-2: `expiresWithinDays` filter on `/v1/expirationitems`** — server-side date-window filter so about-to-expire doesn't over-fetch. *AC:* returns only items within N days.
16. **[Backend][P2] G-3: global file search endpoint** — search attachments across all entity types (not just expiration items).
17. **[Backend][P1] G-5: token revoke endpoint** — `/oauth/revoke` so Sign Out truly invalidates server-side.
18. **[Extension][P2] Menu-bar command + Renew action** — `MenuBarExtra` counts; `POST /renew` action.
19. **[Extension][P0] Store submission package** — icon, metadata, screenshots, README, Raycast review checklist. *(No longer blocked by G-1 — PKCE shipped; needs the production `IsPublic` client id set.)*

---

## 13. Extension Preferences

| Preference | Type | Default | Notes |
|---|---|---|---|
| `apiBaseUrl` | text | `https://api.expirationreminder.com` | REST base (verify exact host at build). Sandbox override supported. |
| `webBaseUrl` | text | `https://app.expirationreminder.com` | Used for `/oauth/authorize` and "Open in Web App" deep links. |
| `defaultExpiryWindow` | dropdown | `30` | Options: 7 / 30 / 60 / 90 days for "about-to-expire". |
| `pageSize` | dropdown | `100` | 25 / 50 / 100 (server cap 500). |
| `telemetryEnabled` | checkbox | `false` | Opt-in anonymous usage events (§10). |

> As of G-1 (PKCE), the extension is a **public client**: there is no `clientId`/`clientSecret` preference. The `client_id` is a baked-in constant (`src/oauth/client.ts` `PUBLIC_CLIENT_ID`) and no secret is sent.

> Exact prod hostnames (`api.` / `app.`) must be confirmed against deployment config before store submission (§15 OQ-4).

---

## 14. Suggested Phases & Rollout

### Phase 0 — Scaffolding & backend enablement
- New Raycast TS repo; `apiClient`; preferences; CI/lint.
- **Backend G-1 (PKCE)** merged to staging; register first-party OAuth client (prod + sandbox).
- **Gating:** secretless PKCE token exchange works end-to-end against staging.

### Phase 1 — Core read commands (internal pilot)
- Expired, About-to-Expire, Search Expirations, Search Contacts, Contact's Expirations, Search Files, shared Detail.
- Pilot with 3–5 internal/friendly users.
- **Gating:** p95 latency targets met; OAuth connect success ≥95% in pilot.

### Phase 2 — Create commands + resilience
- Create Expiration, Create Contact; pagination, backoff, error normalization; opt-in telemetry.
- **Gating:** create success rate, validation-error UX verified; no blob/PII leakage confirmed.

### Phase 3 — Polish & accessibility
- Icons, empty states, urgency accessories, copy actions, README/screenshots.
- **Gating:** Raycast store review checklist passes internally.

### Phase 4 — GA (Raycast Store)
- Public listing; docs/KB article; support playbook (common OAuth issues, base-URL setup).
- Optional P1/P2: Renew action, menu-bar, telemetry dashboards.
- **Gating:** store approval; 90-day metrics instrumentation live.

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| ~~No PKCE; token exchange needs `client_secret`~~ **(resolved, G-1)** | Was blocking safe public Store distribution | ✅ PKCE public-client shipped; extension sends no secret. Remaining: register/flag a production `IsPublic` client and set `PUBLIC_CLIENT_ID` |
| **Auth code TTL is 1 minute** | Slow consent → code expires → connect fails | Complete exchange immediately after redirect; clear retry UX; document expected timing |
| **Attachment endpoint returns base64 content by default** | Memory bloat, slow lists, blob in cache | Always send `includeFileContent=false`; never cache content |
| ~~No date-window filter for "expiring soon"~~ **(resolved, G-2)** | Was over-fetch + client filtering imprecision | ✅ Server-side `expiresWithinDays` (server-UTC window) |
| ~~File search limited to expiration-item attachments~~ **(resolved, G-3)** | Users expect all files | ✅ Global `/v1/attachments/search` across all entity types |
| ~~Sign Out is local-only (no revoke)~~ **(resolved, G-5)** | Was: token valid until expiry after "sign out" | ✅ `POST /oauth/revoke` (best-effort) before clearing local tokens |
| ~~Unknown/unpublished rate limits~~ **(resolved, G-4)** | Throttling under heavy use | ✅ Documented limits + `429`/`Retry-After`; client honors backoff/jitter |
| **Prod hostnames not yet confirmed** | Broken defaults | Preferences are user-overridable; confirm hosts pre-launch (OQ-4) |
| **Large orgs (10k+ items)** | Paging + client filter slow | Cap search pages; "Load More"; push G-2 to reduce client work |

---

## 16. API Dependencies & Gaps

### Existing endpoints reused (verified in `ExpirationReminder.API`)
| Command | Endpoint | Notes |
|---|---|---|
| Show Expired | `GET /v1/expirationitems?status=expired` | status buckets: current/expired/notifying/archived/nodate/missing |
| About-to-Expire | `GET /v1/expirationitems?status=current` + client filter | no server date-window today |
| Search Expirations | `GET /v1/expirationitems?term=` | supports sort/sortDirection/paging |
| Contact's Expirations | `GET /v1/expirationitems/contact/{id}` | paged |
| Search Contacts | `GET /v1/contacts?term=&email=` | paged, sortable |
| Create Expiration | `POST /v1/expirationitems` | body: name, category.id, expiration_date (`yyyy-MM-dd`), details, contact_id |
| Create Contact | `POST /v1/contacts` | name + email required |
| Category dropdown | `GET /v1/categories` | for create form |
| Contact-type dropdown (P1) | `GET /v1/contacttypes` | for create-contact form |
| Search Files | `GET /v1/attachments/expirationitem?includeFileContent=false` | expiration-item attachments only |
| Renew (P1) | `POST /v1/expirationitems/{id}/renew` | date `yyyy-MM-dd` |
| OAuth authorize (consent) | `POST /oauth/authorize` (Blazor) + `Authorize.razor` GET | issues 1-min auth code |
| OAuth token/refresh | `POST /oauth/token` (OAuthController) | GUID access/refresh tokens, `expires_in=3600` |

### Gaps — backend changes (G-1..G-5 shipped 2026-07-18, web-core PR #1687)
- **✅ G-1 (DONE): PKCE / public-client support.** `/oauth/authorize` persists `code_challenge` + `code_challenge_method=S256`; `/oauth/token` verifies the S256 `code_verifier` and allows the `authorization_code` and `refresh_token` grants **without** `client_secret` for clients flagged `IsPublic`. Confidential clients are unchanged. The extension is now a public client (no secret; `client_id` baked in). **Open ops item:** a client must actually be registered/flagged `IsPublic=1` in production — the old QA client `9C68AB28-…` is still confidential, so the public `client_id` is TBD (see `src/oauth/client.ts` `PUBLIC_CLIENT_ID`).
- **✅ G-2 (DONE): server-side `expiresWithinDays` filter** on `/v1/expirationitems`. Inclusive window `[today, today+N]`, null-date items excluded, window computed against **server UTC**. About-to-expire now uses it (no client-side filtering).
- **✅ G-3 (DONE): global file/attachment search** at `GET /v1/attachments/search` across all entity types (expiration items, contacts, locations, vehicles, equipment, companies), permission-scoped, each result carrying `entity_type` + `entity_id`. Search Files now uses it and deep-links per entity type.
- **✅ G-4 (DONE): rate limits enforced + documented.** Fixed-window limiter (default 120/min per token, 30/min per IP) returns `429` with a seconds-integer `Retry-After`. The client already honors it (backoff+jitter, ≤3 retries); no client change needed. See web-core `docs/api-rate-limits.md`.
- **✅ G-5 (DONE): OAuth token revoke endpoint** (`POST /oauth/revoke`, RFC 7009). "Sign Out" now revokes server-side (best-effort) before clearing local tokens.
- **G-6 (nice-to-have, still open): `scope` support.** Tokens currently return empty scope; a read-only scope would let us request least privilege for a mostly-read extension.

---

## 17. Assumptions & Open Questions

### Assumptions
- The `ExpirationReminder.API` (net8.0) is the correct external surface and is deployed at a stable public host with the routes above under `v1`.
- The Bearer token being the `OAuthAccessToken` GUID (not a JWT) is intentional and stable.
- Raycast is macOS-only and the target user base has (or will install) Raycast.
- A first-party OAuth client can be registered by the Expiration Reminder team for the extension.

### Open Questions
- **OQ-1 (RESOLVED):** PKCE (G-1) shipped 2026-07-18; the extension is a public client with no secret. Store submission (ENG-2639) is **no longer blocked on PKCE**. Remaining gate: register/flag a production `IsPublic` OAuth client and set `PUBLIC_CLIENT_ID` in `src/oauth/client.ts`.
- **OQ-2:** Redirect URI strategy — use Raycast's hosted `https://raycast.com/redirect` (Web) or a custom app URI? Must be registered as the OAuth client's `RedirectUri` (exact-match enforced by the token endpoint).
- **OQ-3:** Do we want a read-only scope (G-6) for least privilege, or is full-user-permission acceptable for v1?
- **OQ-4:** Confirm exact prod/sandbox hostnames for `apiBaseUrl` and `webBaseUrl`.
- **OQ-5:** Telemetry destination — reuse PostHog via a proxy, or a dedicated lightweight endpoint? Opt-in either way.
- **OQ-6:** Should "Create Expiration" support attaching a file (base64) via `POST /v1/expirationitems/{id}/attachment`? Deferred to P2 unless there's strong demand.
- **OQ-7:** Team scoping — should list commands let users filter by team (`team_id`)? Deferred to P1 pending demand.
