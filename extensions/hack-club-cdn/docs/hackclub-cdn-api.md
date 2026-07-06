# Hack Club CDN — API Reference (for Raycast extension development)

Research date: 2026-07-01. Compiled from the live site (cdn.hackclub.com) and the
`hackclub/cdn` GitHub repository source code (routes, controllers, models, and
in-app docs pages), which is the authoritative source since the public docs
pages are generated directly from the same markdown files in the repo
(`app/views/docs/pages/*.md`).

This is currently **"CDN V4"**, a Rails 8 app. It is a ground-up rewrite; two
previous incarnations of the CDN (V1/V2 on Vercel, V3 on Hetzner) were lost
entirely due to unpaid hosting bills and no backups (see "What happened?"
below). That history is relevant context for reliability expectations.

---

## 1. What it is, who runs it, intended audience

- **What**: A file-hosting/CDN service — "image hosting for your HTML pages."
  Upload a file, get a permanent URL (`https://cdn.hackclub.com/{id}/{filename}`),
  embed it anywhere (HTML, Markdown, READMEs, Discord, Slack, Notion, etc.).
- **Who runs it**: Hack Club (the nonprofit supporting teenage hackers), maintained
  by a staffer who goes by "nora" (nora@hackclub.com). Source is open on GitHub
  at `hackclub/cdn`.
- **Scale (as fetched)**: ~164,761 files, ~296 GB stored, ~4,263 active users.
- **Intended audience**: Explicitly the **Hack Club community**, not the general
  public. Sign-in is "Sign in with Hack Club" — OAuth against Hack Club's own
  identity provider (Hack Club Auth / "HCA", at `auth.hackclub.com`), not a
  generic public signup. There is no email/password registration flow.
- **Terms of Service** (`/docs/terms`, verbatim key points):
  > "Hack Club CDN is a Hack Club service. By using it, you agree to follow the
  > Hack Club Code of Conduct. Use this service for personal projects,
  > educational work, and open source stuff. Don't upload anything illegal
  > under US law, harmful, or that you don't have rights to. We provide this on
  > an 'as is' basis and may remove content or suspend accounts that violate
  > the Code of Conduct."
- **Privacy** (`/docs/privacy`): Governed by Hack Club's general privacy policy
  (hackclub.com/privacy), plus CDN-specific notes that it stores uploaded file
  content, original filenames/metadata, and upload history/timestamps/sizes for
  quota tracking. Uploaded files are **publicly accessible via their URL** (no
  auth needed to view/download an uploaded file once you know its URL) — the
  security model relies on URL unguessability (UUIDv7 upload IDs, "74 bits of
  cryptographic randomness"), not access control. There is no file listing or
  directory index for outsiders.
- **Support channels**: `#cdn-dev` on the Hack Club Slack
  (`hackclub.slack.com/archives/C08RYDPS36V`, also referenced as
  `hackclub.enterprise.slack.com/archives/C016DEDUL87` on the homepage) and
  GitHub Issues at `github.com/hackclub/cdn/issues`.

### Implication for a public Raycast Store listing

This is **not** a general-purpose public CDN. Authentication is gated behind
Hack Club's own OAuth identity system, which in practice means a user needs
some relationship to Hack Club (their Slack workspace / identity system) to
sign in and mint an API key — this is not a self-serve "anyone with an email"
signup. A Raycast extension built on this API will only be usable by people who
already have (or can get) a Hack Club account, which is a meaningfully
narrower audience than "everyone using Raycast." Worth stating clearly in the
extension's README/Store listing (e.g., "requires a Hack Club account") so
users don't install it expecting generic file-hosting.

---

## 2. Authentication

**Mechanism**: Bearer API token (a personal access token you generate
yourself), *not* a live Slack/OAuth handshake per-request. The token is a long
random string prefixed `sk_cdn_` (generated server-side as
`sk_cdn_#{SecureRandom.hex(32)}`, so 64 hex chars after the prefix).

**How to get a token**:
1. Go to `https://cdn.hackclub.com/` and click **"Sign in with Hack Club"**.
   This kicks off an OmniAuth OAuth2 flow against Hack Club Auth
   (`auth.hackclub.com` in production; scopes requested: `openid email name
   slack_id verification_status`). This is a Hack-Club-specific identity
   provider — there's no evidence of a generic public account-creation form
   independent of Hack Club's ecosystem.
2. Once signed in, visit the **API Keys** page at `https://cdn.hackclub.com/api_keys`
   and create a key (give it a name). **The full token is shown only once**
   at creation time — copy it immediately. Afterward the UI only shows a
   masked form (`sk_cdn_xxxxxx....xxxxxx`).
3. Use the token as a bearer token on every API request:
   ```
   Authorization: Bearer sk_cdn_your_key_here
   ```

**Token storage/validation internals** (from `app/models/api_key.rb` and
`app/controllers/api/v4/application_controller.rb`): tokens are encrypted at
rest (Lockbox) with a blind index for lookup; a key can be revoked
(`revoked: true`), and revoked/invalid tokens get `401 Unauthorized` with
`{"error": "invalid_auth"}`. There is no token expiry/rotation policy
documented beyond manual revocation.

**Revoking a key via API**: `POST /api/v4/revoke` — revokes the API key that
was used to authenticate the request itself (no key ID needed in the body;
it operates on `current_token`). Response:
```json
{ "success": true, "owner_email": "you@hackclub.com", "key_name": "My Key", "status": "complete" }
```

**Anonymous/unauthenticated upload**: **Not supported.** Every API v4 endpoint
(`before_action :authenticate!` in `API::V4::ApplicationController`) requires
a valid bearer token; there is no anonymous or IP-based upload quota. (Files
can also land in the CDN via a Slack bot integration and via a legacy-URL
"rescue" lookup, described below, but neither of those is a public
anonymous-upload API.)

**Verification tiers** (affects quota, not upload capability — see §5): New
accounts start "unverified." Verifying identity through Hack Club's HCA/ID
verification system (`auth.hackclub.com`, submit ID, wait ~1–2 days for
approval) upgrades you to "verified" automatically the next time you sign in
to the CDN. This verification check is done server-side against the HCA API
(`GET /api/external/check?idv_id=...` on the HCA base URL) using the user's
HCA OAuth token captured during sign-in — it is not something an API client
can trigger directly.

---

## 3. Upload API

**Important finding: both direct binary/multipart upload of a local file AND
URL-based mirroring are supported** — this is not URL-mirroring-only like the
older Hack Club CDN generations. A Raycast extension can upload a file
straight from the user's Mac via multipart form data; it does not need to
host the file somewhere else first.

Base URL: `https://cdn.hackclub.com`

### POST /api/v4/upload — direct file upload (multipart/form-data)

Headers:
- `Authorization: Bearer sk_cdn_your_key_here` (required)
- multipart body auto-sets `Content-Type: multipart/form-data`

Body: form field `file` = the binary file.

```bash
curl -X POST \
  -H "Authorization: Bearer sk_cdn_your_key_here" \
  -F "file=@photo.jpg" \
  https://cdn.hackclub.com/api/v4/upload
```

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('https://cdn.hackclub.com/api/v4/upload', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer sk_cdn_your_key_here' },
  body: formData
});
const { url } = await response.json();
```

Response (`201 Created`):
```json
{
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "filename": "photo.jpg",
  "size": 12345,
  "content_type": "image/jpeg",
  "url": "https://cdn.hackclub.com/01234567-89ab-cdef-0123-456789abcdef/photo.jpg",
  "created_at": "2026-01-29T12:00:00Z"
}
```

Server-side implementation notes (from `app/controllers/api/v4/uploads_controller.rb`):
content type is sniffed with Marcel from the actual file bytes (falls back to
the `Content-Type` sent by the client, then `application/octet-stream`); text
content types get `; charset=utf-8` appended automatically; the upload ID is a
pre-generated UUIDv7 used both as the DB primary key and as the storage path
prefix (`{upload_id}/{sanitized_filename}`); file bytes go to a Cloudflare R2
bucket via Active Storage.

### POST /api/v4/upload_from_url — mirror a remote URL

Headers:
- `Authorization: Bearer sk_cdn_your_key_here` (required)
- `Content-Type: application/json` (required)
- `X-Download-Authorization` (optional) — forwarded as the `Authorization`
  header when the CDN's server fetches the source URL, for pulling from
  auth-protected sources.

Body: `{"url": "https://example.com/image.jpg"}`

```bash
curl -X POST \
  -H "Authorization: Bearer sk_cdn_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/image.jpg"}' \
  https://cdn.hackclub.com/api/v4/upload_from_url

# With auth for the source URL:
curl -X POST \
  -H "Authorization: Bearer sk_cdn_your_key_here" \
  -H "X-Download-Authorization: Bearer source_token_here" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://protected.example.com/image.jpg"}' \
  https://cdn.hackclub.com/api/v4/upload_from_url
```

Response shape is identical to `/upload` (same `upload_json`).

Server-side notes (from `app/models/upload.rb`): the server fetches the URL
itself (Faraday, follows up to 5 redirects), so this literally re-implements
the classic "Hack Club CDN mirrors a list of URLs" behavior, but it's now one
URL per request rather than a batch array, and it's just one of two upload
modes rather than the only one. SSRF protections are in place —
`assert_public_url!` rejects non-http(s) schemes and resolves the host to
reject loopback/private/link-local IPs (checked again on every redirect hop).
Quota for URL uploads is checked *after* download (since size isn't known
up front); if it turns out to exceed quota, the upload is deleted and a 402
is returned.

### DELETE /api/v4/upload/:id — delete a file

```bash
curl -X DELETE \
  -H "Authorization: Bearer sk_cdn_your_key_here" \
  https://cdn.hackclub.com/api/v4/upload/01234567-89ab-cdef-0123-456789abcdef
```

Response: `{"id": "01234567-89ab-cdef-0123-456789abcdef", "deleted": true}`.
Returns `404` if the upload doesn't exist **or doesn't belong to the
authenticated user** (ownership is enforced by scoping the lookup to
`current_user.uploads`, so you can't delete/probe other users' files).
Deleting purges the Active Storage blob from R2 and fires a Cloudflare cache
purge job.

### GET /api/v4/me — current user + quota

```bash
curl -H "Authorization: Bearer sk_cdn_your_key_here" \
  https://cdn.hackclub.com/api/v4/me
```
```json
{
  "id": "usr_abc123",
  "email": "you@hackclub.com",
  "name": "Your Name",
  "storage_used": 1048576000,
  "storage_limit": 53687091200,
  "quota_tier": "verified"
}
```

### URL rescue lookup (not an authenticated API, but documented/public)

`GET /rescue?url={original_url}` — looks up files migrated/recovered from the
legacy (V1–V3) Hack Club CDNs by their old URL and 301-redirects to the new
`cdn.hackclub.com` URL if found. For image extensions it returns a 404 SVG
placeholder if not found; otherwise a plain 404. Not useful for a new Raycast
client beyond curiosity/back-compat.

### CDN URL structure / serving

`GET https://cdn.hackclub.com/{id}/{filename}` — 301-redirects to the
underlying Cloudflare R2 asset URL. No auth required to fetch a file once you
have its URL (this is a public CDN link, by design — the whole point is
shareable permanent URLs). Content-Type is served based on file extension.

---

## 4. Listing / viewing previously uploaded files (for a "recent uploads" feature)

**There is no API endpoint for listing a user's uploads.** Confirmed directly
from `config/routes.rb`:

```ruby
resources :uploads, only: [ :index, :create, :destroy ]   # <- web/session-authenticated, HTML only
namespace :api do
  namespace :v4 do
    get "me", to: "users#show"
    post "upload", to: "uploads#create"
    post "upload_from_url", to: "uploads#create_from_url"
    delete "upload/:id", to: "uploads#destroy"
    post "revoke", to: "api_keys#revoke"
  end
end
```

The `index` (listing) action only exists on the **web** `UploadsController`
(session-cookie authenticated, served as HTML at `/uploads`, with search and
pagination — `current_user.uploads.includes(:blob).recent`, `.search_by_filename`,
`.page(params[:page]).per(50)`). It is not exposed under `/api/v4` and is not
API-key-authenticated — it renders an HTML page for the browser session, not JSON.

**Practical implication for the Raycast extension**: there is no supported way
to fetch "my recent uploads" via API key. To build a "recently uploaded files"
feature you would have to either (a) track uploads locally client-side (store
the response of every upload the extension itself makes, in Raycast's local
storage), since the extension already gets full metadata back from
`POST /api/v4/upload`, or (b) scrape/parse the authenticated HTML `/uploads`
page (fragile, requires session cookies from the web OAuth login rather than
an API token, and likely against the spirit of the API-key auth model — not
recommended). Recommend building the extension's "recent uploads" list purely
from its own local upload history rather than depending on the CDN for that.

---

## 5. Limits, retention, allowed file types

### Storage quota tiers (`app/models/quota.rb`, `/docs/quotas`)

| Tier | Per-file limit | Total storage |
|------|-----------------|----------------|
| `unverified` (default for new accounts) | 10 MB | 50 MB |
| `verified` | 100 MB | 50 GB |
| `functionally_unlimited` | 500 MB\* | 300 GB |

\* The public `/docs/quotas` page text says "200 MB" per file for the top tier,
but the actual code (`Quota::ALL_POLICIES`) defines it as `500.megabytes`.
Trust the code: **500 MB per file / 300 GB total** for the top tier. This tier
appears to be admin-assigned rather than self-service (`Quota::ADMIN_ASSIGNABLE
= %i[verified functionally_unlimited]`).

- Unverified → verified upgrade is automatic once you verify your identity via
  `auth.hackclub.com` and sign in again (see §2).
- No documented per-user file-*count* cap — only total bytes and per-file bytes.
- No documented team/org-level pooled quota; quota is per-user.

### Rate limits

**None found.** No rate-limiting gem (e.g., `rack-attack`) appears anywhere in
the Gemfile or codebase, and no throttling logic exists in the API
controllers. Uploads are only gated by storage quota, not request frequency.
(Absence of evidence isn't proof there's no infrastructure-level limiting at
the Cloudflare/edge layer, but nothing is documented or present in app code.)

### Allowed file types

No allowlist/blocklist found in the code — any content type appears to be
accepted (content type is sniffed automatically, not validated against a
whitelist). The only stated restriction is the Terms of Service prohibition on
illegal-under-US-law or harmful content, enforced by human moderation
(removal/account suspension), not automated filtering.

### Retention

Files are intended to be **permanent** — "Upload files, get permanent URLs."
The CDN's whole V4 rewrite was motivated by making URLs durable long-term (see
`/docs/what-happened`, the "what happened?" retro page, summarized below).
Files persist until you explicitly delete them via the web UI or
`DELETE /api/v4/upload/:id`; there's no auto-expiry.

### History note relevant to trustworthiness (from `/docs/what-happened`)

- **V1/V2** (~April 2020, built by Max & Lachlan): worked by creating a new
  Vercel deployment per uploaded file. Died when the Vercel bill went unpaid
  and deployments were reclaimed — all `cloud-*-hack-club-bot.vercel.app` URLs
  went down.
- **V3** (~February 2025, built by Tom/@Deployor): backed by a Hetzner object
  storage bucket. Died when the card on the Hetzner account got
  receipt-locked and all data was nuked (again, an unpaid bill).
  Root causes cited: no backups, and giving out direct bucket URLs rather than
  a domain Hack Club owns.
  Some—not all—files were recovered by scraping originals from Slack; those
  are available via the `/rescue?url=` lookup described above.
- **V4** (current) is built specifically so that even if the Cloudflare R2
  backing store were lost, URLs on `cdn.hackclub.com` (a domain Hack Club
  owns) could be redirected to a restored backup without any links breaking.
  The docs describe the V4 code itself as "not fantastic... written to be
  thrown out and replaced... in a few years," but architected so **upload URLs
  won't need to change** in a future rewrite.

This history is worth surfacing to users of a Raycast extension as a caveat:
this is a small nonprofit-run, best-effort service with a track record of two
prior total data-loss incidents, not an enterprise SLA-backed CDN.

---

## 6. Errors and status codes

| Status | Meaning | Example body |
|--------|---------|--------------|
| 400 | Missing required parameter (`file` or `url`) | `{"error": "Missing file parameter"}` / `{"error": "Missing url parameter"}` |
| 401 | Invalid, missing, or revoked API key | `{"error": "invalid_auth"}` |
| 402 | Storage quota exceeded (either per-file size or total storage) | see below |
| 404 | Resource not found / not owned by the authenticated user | `{"error": "Not found"}` |
| 422 | Validation failed (e.g., ActiveRecord validation error) or generic upload processing failure | `{"error": "Validation failed", "details": [...]}` or `{"error": "Upload failed: <message>"}` |
| 500 | Unhandled server error | `{"error": "<message>", "error_id": "<sentry event id>"}` |

**402 quota error body** (both for exceeding per-file size and for exceeding
total storage):
```json
{
  "error": "Storage quota exceeded",
  "quota": {
    "storage_used": 52428800,
    "storage_limit": 52428800,
    "quota_tier": "unverified",
    "percentage_used": 100.0
  }
}
```
For a per-file-size violation specifically, the `error` message is customized,
e.g. `"File size exceeds your limit of 10 MB per file"`, still with the same
`quota` object attached.

Auth is checked via `authenticate_with_http_token` (standard `Authorization:
Bearer <token>` parsing) in
`API::V4::ApplicationController#authenticate!`; any inactive/revoked/invalid
token produces the same generic `401 {"error": "invalid_auth"}` — the API
does not distinguish "wrong token" from "revoked token" in the response body
(confirmed identical in both cases via the controller test suite).

---

## 7. SDKs, CLI tools, existing integrations

**No official SDK, CLI tool, or client library was found** in the repository
or linked from the docs — the "API documentation" page is the entire extent
of official integration guidance (curl + raw `fetch` JS snippets only, no npm
package, no Python package, no published OpenAPI/Swagger spec).

No evidence of an existing Raycast, Alfred, or similar launcher-style
integration for this CDN was found in the repo or docs. The only non-web
"integration" is the **Slack bot** (`app/jobs/process_slack_file_upload_job.rb`,
`app/controllers/slack/events_controller.rb`, `app/services/slack_service.rb`)
which lets Hack Club Slack members upload by dropping files in Slack and
notifies them via Slack Block Kit-style messages
(`upload_success.slack_message.slocks` / `upload_error.slack_message.slocks`).
That's a first-party integration, not a reusable client library.

A prior community script exists for scraping/recovering old CDN files:
`https://github.com/maxwofford/cdn-bucketer` (credited in `/docs/what-happened`
as "the original pass" at the V1/V2/V3 recovery scraper) — not relevant as an
API client pattern, since it predates and doesn't use the current V4 API.

**Conclusion for the Raycast extension developer**: you'll be writing the API
client from scratch against the plain REST endpoints described in §3; there's
no existing package to adopt or crib prior-art API-usage patterns from.

---

## 8. Relationship to Hack Club as an organization

- This is a **first-party Hack Club service**, gated behind Hack Club's own
  identity system (Hack Club Auth / OmniAuth `hack_club` provider,
  `auth.hackclub.com`), requesting scopes `openid email name slack_id
  verification_status`. Practically, this means a user needs a Hack Club
  identity — most naturally acquired by being part of the Hack Club teenage
  hacker community / Slack — to sign in and self-serve an API key.
- There is **no indication of a generic public "create an account with just an
  email" flow** independent of Hack Club's ecosystem. The verification tier
  system (unverified → verified) is also tied to Hack Club's separate identity
  verification pipeline (`auth.hackclub.com`, ID submission, "HCA ops"
  approval), which again presumes engagement with Hack Club specifically
  (this is normally used to confirm a user is a teenager participating in
  Hack Club programs).
- **Implication for a public Raycast Store listing aimed at a general
  audience**: this API is fundamentally scoped to Hack Club community members.
  A Raycast extension published to the general Raycast Store should clearly
  disclose that it requires a Hack Club account (and that the underlying
  service's Terms of Service restrict use to "personal projects, educational
  work, and open source stuff" and require following the Hack Club Code of
  Conduct) — it is not a plug-and-play CDN for arbitrary Raycast users without
  that affiliation. It would be reasonable/expected to frame the extension in
  its listing as "for Hack Club members" rather than as a general-purpose
  image-hosting tool.

---

## Open questions / things NOT confirmed

- **Exact scope of who can obtain a Hack Club identity/OAuth account** (e.g.,
  whether literally anyone can create a Hack Club Slack/identity account and
  thus use the CDN, vs. it being restricted to verified teenage
  hackers/participants) was not fully determined from the CDN repo alone —
  that's governed by Hack Club's separate identity system (`auth.hackclub.com`),
  which was out of scope for this research (its own source wasn't fetched).
- **Whether there's edge/infrastructure-level rate limiting** (e.g. at
  Cloudflare, outside the Rails app) could not be ruled out — only confirmed
  that the application code itself has none.
- **Whether the "functionally_unlimited" tier is ever attainable by a normal
  user** (vs. being purely an admin-assigned tier for staff/special cases) is
  not fully documented — the code marks it admin-assignable but doesn't
  specify the criteria for who gets it.
- **No public OpenAPI/Swagger spec exists**; all endpoint details above were
  cross-verified against both the rendered docs page and the actual
  controller/route source, so they should be accurate as of this repo
  snapshot, but there's no machine-readable contract to diff future API
  changes against.

---

## Sources

- https://github.com/hackclub/cdn (full source: `config/routes.rb`,
  `app/controllers/api/v4/*`, `app/controllers/uploads_controller.rb`,
  `app/controllers/sessions_controller.rb`, `app/controllers/external_uploads_controller.rb`,
  `app/models/upload.rb`, `app/models/api_key.rb`, `app/models/user.rb`,
  `app/models/quota.rb`, `app/services/quota_service.rb`, `app/services/hca_service.rb`,
  `config/initializers/hack_club_auth.rb`, `config/initializers/omniauth.rb`,
  `test/controllers/api/v4/*`, `README.md`,
  `app/views/docs/pages/{api,getting-started,quotas,terms,privacy,using-cdn-urls,what-happened}.md`)
- https://cdn.hackclub.com/
- https://cdn.hackclub.com/docs/getting-started
- https://cdn.hackclub.com/docs/api
- https://cdn.hackclub.com/docs/quotas
- https://cdn.hackclub.com/docs/using-cdn-urls
- https://cdn.hackclub.com/docs/terms
- https://cdn.hackclub.com/docs/privacy
- https://cdn.hackclub.com/docs/what-happened
- https://hackclub.com/conduct/ (Code of Conduct, referenced by ToS)
- https://hackclub.com/privacy/ (referenced by Privacy Policy)
- https://github.com/hackclub/cdn/issues
- https://github.com/maxwofford/cdn-bucketer (legacy recovery script, referenced in what-happened.md)
