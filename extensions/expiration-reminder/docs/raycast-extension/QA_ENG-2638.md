# QA / Testing Pass — ENG-2638

End-to-end QA before Store submission. This plan is grounded in the actual implementation on
branch `joseleon/eng-1290-create-raycast-extension` (not the PRD draft), so every step matches
what the code really does.

> **Environment for this pass:** production API `https://api.expirationreminder.com` with a real
> test account (no sandbox available). **Consequences:** the Create tests (C6/C7) write **real**
> records — clean them up after, or use clearly-labelled test names. The 429/5xx/403 fault-injection
> cases can't be forced safely on prod; treat them as read-through/graceful-degradation checks only.

> **Why this is a manual pass:** Raycast commands only run inside the Raycast app driving a real
> OAuth browser consent flow against a live API. The static gates (`tsc --noEmit`, `ray build`,
> `ray lint`) already pass; this pass covers everything those can't observe.

---

## 0. Preflight — you must have all of these before starting

| # | Prerequisite | How to confirm |
| --- | --- | --- |
| P1 | **Raycast for Windows** installed and running (this repo/dev machine is Windows 11). | Raycast launcher opens. |
| P2 | Node on PATH for this shell. | `export PATH="/c/Program Files/nodejs:$PATH"; node -v` → v24 |
| P3 | **API + web hosts are compile-time constants** (no preference to set). | API = `https://api.expirationreminder.com`, web/consent host = `https://app.expirationreminder.com` (`API_BASE_URL` / `WEB_BASE_URL` in `src/lib/preferences.ts`). This pass runs against **production**. *Known limitation:* non-prod testing requires editing those constants and rebuilding — there is no base-URL override preference. |
| P4 | **Registered PUBLIC OAuth client** (`IsPublic=1`) with a `RedirectUri` that **exact-matches** the extension's redirect. | Register **`https://raycast.com/redirect/extension`** (the query-less form the extension uses) as the client's `RedirectUri`. Token exchange enforces exact match. |
| P5 | **Public `client_id`** set in `src/oauth/client.ts` (`PUBLIC_CLIENT_ID`). No client secret — PKCE public client. | Confirm `PUBLIC_CLIENT_ID` is the GUID of the production `IsPublic=1` client, then rebuild. **If it is still empty, connect will fail with a clear "no OAuth client id configured" toast.** |
| P6 | **Representative data**: ≥1 already-expired item, ≥1 item expiring within 7 days AND one 31–90 days out, ≥25 current items (to force a 2nd page), ≥1 contact with expirations, and file attachments on **more than one entity type** (e.g. an expiration item AND a contact; ideally one large file, to prove blob-avoidance). | Seed via web app or API. |
| P7 | A way to watch outbound requests (blob-avoidance + payload-shape checks). | Raycast dev console / a proxy (Fiddler/mitmproxy), or backend request logs. |

---

## 1. Setup & run

```bash
export PATH="/c/Program Files/nodejs:$PATH"
cd /c/dev/raycast-extension
npm run dev            # ray develop — registers the 8 commands into Raycast in dev mode
```

Then in Raycast:
1. No connection preferences to set — the API/web hosts and the public `client_id` are all
   baked in (P3, P5). The only prefs are `defaultExpiryWindow`, `pageSize`, and `telemetryEnabled`
   (⌘, on any command), none of which affect connect.
2. Run a protected command → browser consent opens. **Capture the redirect URI** Raycast presents
   (it's `authRequest.redirectURI`, built from `OAuth.RedirectMethod.Web`) and confirm it is
   registered as the client's `RedirectUri` (P4). A mismatch surfaces as an invalid-redirect error
   at the token exchange.

---

## 2. OAuth lifecycle (`src/oauth/client.ts`)

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| A1 | **Connect success** | Fresh state, run a command, approve consent. | Tokens stored; command loads data. |
| A2 | **Unconfigured client-id guard** | Build with `PUBLIC_CLIENT_ID = ""` and run a command. | Friendly toast: "This build has no OAuth client id configured…" (no crash). With a real `PUBLIC_CLIENT_ID` set, connect proceeds normally. |
| A3 | **Proactive (silent) refresh** | Connect, then wait until access token is within 60s of expiry (`REFRESH_BUFFER_SECONDS`) or shorten sandbox TTL; run a command. | Token refreshes silently via refresh grant; no consent prompt; data loads. |
| A4 | **Reactive 401 refresh** | Connect, then server-side invalidate/expire the access token (keep refresh token valid); run a command. | Single silent refresh + one transparent retry (`allowAuthRetry` path in `api/client.ts`); data loads, no user-visible error. |
| A5 | **Revoked / dead refresh token → re-auth** | Revoke the refresh token server-side; run a command. | Refresh fails → falls back to full consent prompt (not a raw error). |
| A6 | **Sign out (server-side revoke)** | Use "Sign Out", then run a command. | `POST /oauth/revoke` fires (best-effort) then local tokens clear; next command re-prompts consent. **Verify the revoked token is dead server-side** (an API call with the old access token → 401). If revoke network-fails, sign-out must still clear locally (not get stuck). |

---

## 3. Command matrix

For **every** command verify: happy path · empty state · error states (see §4) · performance (§5).

| ID | Command | File | Key checks |
| --- | --- | --- | --- |
| C1 | **Show Expired** | `show-expired.tsx` | Most-overdue-first ordering; days-overdue accessory; Load More paginates; Detail push (↵) + Open in Web App (⌘↵ → `/expirationitem/view/{id}`). |
| C2 | **Show About-To-Expire** | `show-about-to-expire.tsx` | Dropdown 7/30/60/90 refetches; **server-side `expiresWithinDays` filter** (ENG-2641) — results correct at each window; default from `defaultExpiryWindow` pref. Boundary items (exactly today, exactly today+N) included; null/no-date items excluded. **Note:** window is server-UTC — sanity-check boundary items near midnight local time. Load More paginates within the window. |
| C3 | **Search Expirations** | `search-expirations.tsx` | <2 chars → "Keep typing…" hint; ≥2 chars → debounced (300ms) server search; empty → "No matches"; latest-wins (abort) on fast typing. |
| C4 | **Search Contacts** | `search-contacts.tsx` | Name search; email-shaped query routes to `email=` param; empty/hint states. |
| C5 | **Contact's Expirations** | `contact-expirations.tsx` | Pick contact → drill into `/v1/expirationitems/contact/{id}`; back navigation; empty state for a contact with none. |
| C6 | **Create Expiration** | `create-expiration.tsx` | Required-field validation (name, date); category dropdown from `/v1/categories`; async contact dropdown (≥2 chars); date serialized `yyyy-MM-dd`. **⚠ Payload shape:** body sends `category: { id }` and `contact_id` — verify the sandbox API accepts these exact names (highest 400 risk). Success toast + "Open in Web App"; form resets. |
| C7 | **Create Contact** | `create-contact.tsx` | Name + email required; optional mobile/phone; **409 duplicate email** path (§4); success toast. |
| C8 | **Search Files** | `search-files.tsx` | <2-char hint; ≥2-char **global** search (`/v1/attachments/search`) across all entity types; entity-type tag + size + created accessories; **"Open {Entity} in Web App" deep-links per entity type** (`/{entity_type}/view/{id}`) — verify a file on a contact opens the contact, one on an expiration item opens the item. Unknown/unmapped entity type → action hidden (no broken URL). Only page 1 fetched (server pages at 25, no Load More) — confirm acceptable. |

---

## 4. Error-state matrix (drive each; `src/lib/errors.ts` maps the messages)

| Status | How to trigger on sandbox | Expected user-facing message |
| --- | --- | --- |
| **401** | Expire/invalidate token (see A4/A5). | Silent refresh+retry; only if that fails → "Your session expired. Please connect again." |
| **403** | Use a token whose user lacks permission for a record/endpoint. | "You don't have permission to do that." |
| **404** | Open a contact's expirations for a deleted/bad id. | "Not found." (or API message). |
| **400** | Submit Create Expiration with a bad payload (e.g. malformed date, bad category id). | API message, else "The request was rejected. Please check the values and try again." |
| **409** | Create a contact with an already-used email. | API message (duplicate), else the 400/409 generic. |
| **429** | Hammer a search (or have backend force it). | Backoff + jitter, up to 3 retries honoring `Retry-After`; final → "Too many requests. Please slow down and try again shortly." |
| **5xx** | Backend fault injection if available. | Up to 3 backoff retries; final → "Expiration Reminder had a problem. Please try again." |
| **Network (0)** | Disable network / airplane mode (the API host is a fixed constant — not overridable to force this). | 3 retries then → "Couldn't reach Expiration Reminder. Check your internet connection." |

---

## 5. Performance & data-hygiene (ENG-2638 acceptance)

| ID | Check | Target / expectation | How |
| --- | --- | --- | --- |
| Q1 | List open latency | **< 1.2s p95** on representative data | Time C1/C2 open→rendered a few times. |
| Q2 | Search keystroke latency | **< 700ms** post-debounce | Time from debounce fire → results (telemetry `latency_ms` if telemetry enabled, else stopwatch). |
| Q3 | **Blob avoidance** | No base64 `content` ever fetched/cached | In P7 tooling confirm every `/v1/attachments/search` request carries `includeFileContent=false` and responses contain **no** `content` field. |
| Q4 | **No PII beyond session** | Cache cleared on sign-out; no tokens/PII in plaintext logs | Sign out (A6), inspect Raycast local storage / logs. |
| Q5 | **Permission scoping** | Extension only shows records the connected user may see | Compare a scoped sandbox user's Raycast results vs. web app for that same user. |

---

## 6. Exit criteria (maps to ENG-2638 acceptance)

- [ ] All 8 commands pass §3 happy/empty/short-query, §4 error matrix on sandbox.
- [ ] OAuth A1–A6 all pass.
- [ ] Performance targets Q1–Q2 met on representative data.
- [ ] Blob/PII hygiene Q3–Q4 confirmed.
- [ ] Permission scoping Q5 confirmed.
- [ ] Any defects filed as sub-issues; retest after fix.

## 7. Watch-list — verified against developers.expirationreminder.com + still-live items

Doc-verified (2026-07-14), no longer a live risk:
- ✅ **Create Expiration payload** (C6): API accepts `category: { id }` + single `contact_id`, with `name`/`expiration_date` required — matches `endpoints.ts` exactly.
- ✅ **Create Contact** (C7): 409 on duplicate email confirmed. Note the API requires only `email`; the extension form *also* requires `name` (stricter by design — **not** a bug).
- ✅ **List envelope** (`expiration_items`/`page`/`pages`/`total`) and `sortDirection` default `asc` confirmed. `expiresWithinDays` server-side filter now exists (G-2, verified in web-core PR #1687) and is used directly.

Still verify live (docs don't fully specify):
1. **About-to-expire server filter** (C2): confirm `status=current&expiresWithinDays=N` returns the inclusive `[today, today+N]` set with null-date items excluded, and that the server-UTC boundary matches expectations near local midnight.
2. **OAuth PKCE public-client** (G-1): confirm the **secretless** `authorization_code` and `refresh_token` grants succeed against a real `IsPublic=1` client, and a tampered `code_verifier` → `invalid_grant`. **Blocker:** the production public `client_id` must be registered/flagged and set in `PUBLIC_CLIENT_ID` — the old QA client `9C68AB28-…` is still confidential and will NOT work secretless.
3. **Server-side revoke** (A6, G-5): confirm `POST /oauth/revoke` invalidates the token (subsequent API call → 401) and is idempotent; sign-out still clears locally if revoke fails.
4. **Retry-After honoring** (429, G-4): limits now enforced (~120/min per token). Confirm the seconds-integer `Retry-After` is returned and the client backs off. See web-core `docs/api-rate-limits.md`.
