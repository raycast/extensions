# Kyo for Raycast

Create, view, and edit everything in your [Kyo](https://www.trykyo.com) agencyOS
workspace from Raycast: **deals, deal activity, deal comments, deal tasks,
tasks, projects, spaces, people, and companies**.

Built entirely on Kyo's public, documented REST API and OAuth 2.0 provider:

- REST API — https://www.trykyo.com/docs/api
- OAuth 2.0 (auth code + PKCE) — https://www.trykyo.com/docs/oauth

## Commands

| Command | What it does |
| --- | --- |
| **Search Deals** | Browse/filter deals by pipeline, view details, move stage, open activity, comments, and deal tasks |
| **Create Deal** | Create a deal in a pipeline (stage, company, value, confidence, notes) |
| **Search People** | Browse CRM contacts, edit, copy email, open LinkedIn |
| **Create Person** | Add a contact (email, phone, position, company, socials) |
| **Search Companies** | Browse companies, filter by industry, edit, open website |
| **Create Company** | Add a company (website, industry, size, socials, notes) |
| **Search Tasks** | Browse workspace tasks (open/completed/by space), complete/reopen, edit, comment |
| **Create Task** | Quick-create a task (space, project, priority, dates, private) |
| **Search Spaces** | Browse client spaces, drill into projects and their task lists, edit |
| **Create Space** | Create a client space |
| **Create Project** | Create a project inside a space |

Deal activity is **read-only** (Kyo's audit feed). Comments work on both deals
and tasks (`entity_type` = `deal` or `task`, per the API). There is **no delete**
anywhere: Kyo's API v1 is non-destructive, so this extension only ever creates
and updates.

## Setup

None. The extension ships with Kyo's first-party `kyo_raycast` OAuth client
(a verified, public/PKCE app — no API keys to paste). On first run it opens
Kyo's consent screen in your browser; approve the requested scopes and you're
connected. Access tokens last 1 hour and refresh automatically (refresh tokens
rotate on every use, exactly as Kyo documents).

### Using your own OAuth app instead (optional)

Power users can point the extension at their own registered app:

1. In the Kyo app, open **Settings → API** and create a new OAuth application
   (**public client** — no client secret; PKCE only).
2. Add this exact **redirect URI** (Raycast's OAuth redirect, matched exactly
   including the query string):

   ```
   https://raycast.com/redirect?packageName=Extension
   ```

3. Paste the generated client id (prefix `kyoapp_…`) into the extension's
   **OAuth Client ID** preference in Raycast.

### Scopes requested

Full read/write on deals, people, companies, tasks, pipelines, labels, comments,
and spaces, plus `activity:read` and `credits:read`. The metered
`enrich:write` scope is intentionally **not** requested (enrichment spends
workspace credits), matching the Kyo CLI's default grant.

## Development

```bash
npm install
npm run dev      # ray develop — live-reload into Raycast
npm run build    # ray build
npm run lint
```

Requires Node.js 18+ and the Raycast app.

## Project layout

```
src/
  api/
    config.ts       # Base URL, OAuth endpoints, anon key, scopes (from docs)
    oauth.ts        # PKCE sign-in + refresh/rotation + revoke
    client.ts       # fetch wrapper: headers, keyset pagination, error mapping
    types.ts        # Resource types (documented writable fields)
    resources.ts    # One typed module per resource + verb
  hooks/useLookups.ts   # Cached dropdown/lookup data
  lib/helpers.ts        # Formatting + error toasts
  components/           # Detail views, forms, comment/activity/task lists
  <command>.tsx         # One file per manifest command
```

## Notes on the embedded keys

`API_BASE`, the OAuth endpoints, and the `apikey` anon key in `src/api/config.ts`
are the **public** values Kyo publishes in its docs. Per Kyo: the `apikey`
"grants nothing by itself; all authorization comes from the bearer token." No
secrets are stored in this repo.
