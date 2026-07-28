# Expiration Reminder for Raycast — Help & Support Playbook

Covers ENG-2639 AC#2 (help doc + support playbook). Two audiences:

- **Part 1 — Help article** for end users (getting started, connecting, using the commands).
- **Part 2 — Support playbook** for the support/on-call team (common issues, how to diagnose, resolution).

> **Publishing:** this markdown is the source of truth in the repo. Publish Part 1 to the customer help center and Part 2 to the internal knowledge base (Slite) when submitting the Store listing.

---

## Part 1 — Help article (end users)

### What it is

The Expiration Reminder Raycast extension gives you keyboard-driven access to your Expiration Reminder compliance data from the [Raycast](https://raycast.com) launcher on macOS — view expired and about-to-expire items, search expirations, contacts, and files, and create new records without opening the web app.

### Install & connect

1. Install **Expiration Reminder** from the Raycast Store.
2. Run any command (e.g. **Show Expired Items**).
3. Your browser opens an Expiration Reminder consent screen — **approve** it.
4. Raycast stores your session securely. You won't be asked again until you sign out or the session is revoked.

There is **nothing to configure to connect** — no URLs, no client id, no secret. Sign-in uses OAuth 2.0 Authorization Code + PKCE against `app.expirationreminder.com`.

### Commands

| Command | What it does |
| --- | --- |
| Show Expired Items | Everything past its expiration date, most overdue first. |
| Show About-To-Expire Items | Items expiring within a window (7/30/60/90 days). |
| Search Expirations | Search expiration items by name. |
| Search Contacts | Search contacts by name or email. |
| Show a Contact's Expirations | Drill from a contact into their items. |
| Create an Expiration | Add a new expiration item. |
| Create a Contact | Add a new contact. |
| Search Files | Search document attachments across your records. |

### Preferences (all optional)

- **Default "Expiring Soon" Window** — the default range for About-To-Expire (7/30/60/90 days).
- **Page Size** — rows per page for lists (25/50/100).
- **Telemetry** — opt-in, anonymous, PII-free usage events (off by default).

### Signing out

Use **Sign Out** from any command's Action Panel. This revokes your session on the server and clears it locally. Next time you run a command you'll be asked to approve consent again.

### What you can and can't do (v1)

- **Can:** view, search, and create expirations and contacts; search files.
- **Can't yet:** edit, delete, or renew records from Raycast — do those in the web app.

---

## Part 2 — Support playbook (internal)

### How the connection works (1-paragraph model)

The extension is a **public OAuth client** using Authorization Code + PKCE (S256), no client secret. The browser hits `app.expirationreminder.com/oauth/authorize`; the token exchange and refresh hit `api.expirationreminder.com/oauth/token`. The bearer `access_token` is a GUID (the `OAuthAccessToken` id), TTL 3600s, refreshed proactively ~60s before expiry and reactively on a `401` (one silent refresh + one retry). Sign Out calls `POST /oauth/token`'s sibling `POST /oauth/revoke` before clearing local tokens. Hosts are compiled in — users cannot point the extension elsewhere.

### First questions to ask

1. Which command, and what exactly appears (toast text / screenshot)?
2. Does it fail at **connect** (consent) or **after** connecting (a specific command)?
3. Can they reach `app.expirationreminder.com` in a browser and sign in normally?

### Issue → diagnosis → resolution

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| **"Session expired, please sign in again"** (was a `401`) | Token revoked/expired and refresh also failed | Have them **Sign Out** then re-run a command to re-consent. If it recurs immediately, the account's tokens may have been revoked server-side — check the user's `OAuthClientConnection`. |
| **Consent screen flashes, then returns to sign-in with no error** | Raycast didn't capture the `code` from the redirect | Confirm they completed consent in the browser that Raycast opened (not a different profile). Retry. If persistent, this is the redirect-capture path — escalate to engineering with the timestamp. |
| **"You don't have permission…"** (`403`) | The connected user lacks access to that record/entity | Expected — the extension reflects the user's permissions. Verify their role/record access in the web app. Not an extension bug. |
| **"Not found"** (`404`) on open/deep-link | Record was deleted, or the user can't see it | Confirm the record exists and is visible to them in the web app. |
| **"Too many requests"** (`429`) | Rate limit hit; client already retried 3× with backoff | Transient — wait and retry. If chronic, review the tenant's usage / rate-limit tier. |
| **"Couldn't reach Expiration Reminder. Check your internet connection."** (status 0) | Network/DNS/offline, or API host down | Check their connectivity and API status. Host is fixed (`api.expirationreminder.com`) — not user-overridable. |
| **A create fails with a validation message** (`400`) | Missing/invalid field (e.g. no name, bad date) | The toast carries the API message. For contacts, a duplicate email returns `409` — the contact already exists. |
| **Old extension icon / stale command list** | Raycast root-search icon cache | Fully quit and relaunch Raycast; if still stale, remove and re-add the extension. (Dev-only concern.) |

### No longer applicable (pre-launch legacy)

- **"The client secret is invalid"** — the extension no longer uses a client secret (public PKCE). If this ever appears, the account is somehow hitting a confidential-client path — escalate to engineering.
- **"Set your OAuth Client ID…"** — there is no Client ID preference anymore.

### Escalation

If the issue isn't in the table above, or a `401`/redirect problem recurs after a clean Sign Out + reconnect, escalate to engineering with: the command, the exact toast, timestamp (for correlating server logs), and whether a browser sign-in to `app.expirationreminder.com` works. Do **not** ask users for tokens or secrets — the extension never exposes them.
