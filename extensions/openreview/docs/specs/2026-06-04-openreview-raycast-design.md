# OpenReview Raycast Extension — Design Spec

**Date:** 2026-06-04
**Status:** Design (pending implementation plan)

## 1. Purpose & Scope

A read-only Raycast extension that lets the author see, at a glance, the status
and review scores of their own OpenReview submissions across every venue —
mirroring the data shown in OpenReview's **Author Console** ("Author Tasks") view.

**In scope**

- Log in to OpenReview, auto-detect the signed-in user's profile, and list every
  submission where the user is an author (across all venues).
- For each submission, show: submission number, title, authors, venue/status,
  PDF/forum links, the per-reviewer scores, the aggregate review scores
  (average / min / max), and the decision (when available).

**Out of scope (deliberately deferred — YAGNI)**

- Drafting rebuttals (the existing `openreview-rebuttal` skill covers that).
- Posting comments / official reviews / rebuttals back to OpenReview.
- Menu-bar / push notifications for new reviews.

These can each become a separate command later without redesigning the core.

## 2. Reference: the data we reproduce

The target is the OpenReview Author Console row layout (example submission
`1042`, ICML 2026):

| Column | Contents |
|---|---|
| **#** | Submission number (`1042`) |
| **Submission Summary** | Title, Download PDF, author list, venue tag ("Submitted to ICML 2026"), Show details |
| **Official Review** | "N Official Reviews Submitted"; per reviewer: `Reviewer jkfT: Overall_recommendation: 4 / Confidence: 3` + Read Official Review link; then `Average Overall Recommendation: 4.00 (Min: 3, Max: 5)`, `Average Confidence: 3 (Min: 2, Max: 4)` |
| **Decision** | Venue/status line + `Recommendation: Reject` + Read link |

## 3. Tech stack

- **Raycast extension**: TypeScript + React, `@raycast/api`, `@raycast/utils`
  (for `useCachedPromise`). Scaffolded with `npm init raycast-extension`.
- **OpenReview API v2**: base URL `https://api2.openreview.net`. No official JS
  SDK, so we call the REST API directly with the global `fetch` (Node 18+).
- **macOS only** (Raycast is macOS-only — matches the user's environment).
- **Project location**: standalone repo at `~/Project/openreview-raycast`
  (unrelated to the `hpc` repo). Used locally via Raycast "Import Extension".

## 4. Authentication

**Decision: store email + password in Raycast preferences. Rationale below.**

OpenReview provides **no API keys, personal access tokens, or OAuth** for
third-party clients. The only authentication path is `POST /login` with
username/password, which returns a short-lived **JWT** (default 1 hour, max
**1 week** via `expiresIn`). There is therefore no permanent token to store in
place of a password — any token is itself obtained by logging in and expires
within a week.

Consequences considered:

- **Chosen — store password** (this design): the extension logs in on demand and
  auto-refreshes the token. Matches the official `openreview-py` client
  (`OPENREVIEW_USERNAME` / `OPENREVIEW_PASSWORD`). Safe because Raycast stores a
  `type: "password"` preference in its **local encrypted database / macOS
  Keychain** (not plaintext, extension-scoped — see Raycast Security docs), and
  the password is exercised only on (re)login (~weekly); steady state sends only
  the cached JWT.
- **Rejected — token-only (paste a JWT, no stored password)**: marginally more
  secure (no long-term credential at rest) but the token expires in ≤1 week,
  after which the extension breaks until the user manually pastes a fresh token.
  The UX cost outweighs the small security gain for a personal read-only tool.
- **Rejected — API key**: not offered by OpenReview.

- **Preferences** (extension-level, configured in `package.json`):
  - `username` — OpenReview login email (`text`).
  - `password` — OpenReview password (`password` type).
- **Token flow** (`src/lib/auth.ts`):
  1. `POST /login` with `{ id: username, password }` → `{ token, user }`.
  2. Cache `token`, its expiry, and `user.id` (e.g. `~Ada_Lovelace1`) in Raycast
     `LocalStorage`. Request a long token expiry (`tokenExpiresIn`, up to the
     1-week max) to minimise re-logins.
  3. On each run, reuse the cached token if unexpired; otherwise re-login.
  4. Auth header for subsequent calls: `Authorization: Bearer <token>`.
- **Failure handling**: a 401/invalid-credential response surfaces a `Detail`
  view explaining the problem with an `Action` to open extension preferences.

## 5. Data flow

`src/lib/openreview.ts` (pure-ish API client) + `src/lib/parse.ts` (pure
transforms):

1. Get a valid token + the author's profile id (`~First_Last1`).
2. Fetch the author's submissions:
   `GET /notes?content.authorids=<profileId>&details=directReplies` (paginated
   via `offset`/`limit`, following `count`). `details=directReplies` returns each
   submission's replies (reviews, decision, meta-review) inline, so reviews need
   no extra round-trips.
3. For each submission note, `parse.ts` extracts a normalized `Submission`:
   - `number` (`note.number`), `title` (`content.title.value`),
     `authors` (`content.authors.value`), `pdf` (`content.pdf.value` → forum URL),
     `forumUrl` = `https://openreview.net/forum?id=<note.forum>`.
   - `venue` (`content.venue.value`, e.g. "Submitted to ICML 2026"),
     `venueId` (`content.venueid.value`).
   - **Reviews**: replies whose `invitation`/`invitations` match
     `/Official_Review/`. Per review extract a *rating* and *confidence* via a
     field-name heuristic (case-insensitive): rating ∈
     {`overall_recommendation`, `rating`, `recommendation`, `score`}, confidence ∈
     {`confidence`}. Numeric value parsed from the v2 `{ value }` wrapper, taking
     the leading integer when the field is a string like `"4: marginally above"`.
     Reviewer label from the signature anonymized id (e.g. `Reviewer jkfT`).
   - **Aggregates**: `avg`, `min`, `max` for rating and confidence (matching the
     "Average … (Min: x, Max: y)" line). Computed only over reviews that have the
     field; otherwise `N/A`.
   - **Decision**: reply matching `/Decision/` (fallback `/Meta_Review/`) →
     `content.decision`/`recommendation` value (e.g. "Reject"). `null` if absent.
   - `reviewCount` = number of Official Reviews.

The heuristic field matching isolates per-venue variation (ICML uses
`Overall_recommendation`; ICLR uses `rating`) in one place.

## 6. UI

**One command: "My Submissions"** (`view` mode).

- **List** (`src/my-submissions.tsx`):
  - One row per submission. Title as the row title; `#<number>` as subtitle.
  - Accessories: average rating (e.g. `★ 4.00`), review count (`4 reviews`),
    and a status tag (decision if present, else venue/"under review").
  - `useCachedPromise` for instant render from cache + background revalidate;
    `⌘R` to refresh.
  - Search bar filters by title across all venues.
  - Optional: section the list by venue (`List.Section`) for grouping.
  - Actions: "Show Details" (push `Detail`), "Open Forum in Browser",
    "Open PDF", "Open Extension Preferences".
- **Detail** (push navigation, `src/components/SubmissionDetail.tsx`):
  - Markdown body reproducing the Author Console row:
    - Header: title, `#number`, authors, venue.
    - Official Review section: `N Official Reviews Submitted`, a table/list of
      `Reviewer X: rating R / confidence C` with per-review forum links, then the
      Average / Min / Max lines for recommendation and confidence.
    - Decision section: status line + recommendation + forum link.
  - Metadata sidebar: venue, status, review count, averages.
  - Actions: open forum, open PDF, copy scores.

## 7. Error handling

- Network / non-2xx → `showToast` failure + a `Detail` fallback with the error.
- Auth failure → preferences-prompt `Detail` (see §4).
- Missing score fields → render `N/A`, never crash; aggregates skip missing.
- Empty submission set → `List.EmptyView` ("No submissions found for <profile>").

## 8. Testing

- `parse.ts` is pure and unit-tested against captured OpenReview v2 JSON
  fixtures (one real submission note with `directReplies` per venue style:
  ICML `Overall_recommendation`, ICLR `rating`). Assert extracted scores,
  averages (incl. min/max), decision, and `N/A` behavior for missing fields.
- `auth.ts` token-expiry logic unit-tested with a mocked clock + LocalStorage.
- API client functions kept thin so the parsing/aggregation logic — the part
  most likely to break across venues — is fully testable without network.

## 9. Open questions / risks

- **Exact "my submissions" query**: `content.authorids=<id>` is the documented
  author-facing filter; if blind-submission visibility limits it, fall back to
  the profile's submission list endpoint. Verified during implementation against
  a live account.
- **Per-venue field names**: handled by the heuristic in §5; new venues may need
  an added alias. Logged (not crashed) when no rating field is found.
