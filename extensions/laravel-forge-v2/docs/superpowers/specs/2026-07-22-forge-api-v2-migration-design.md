# Laravel Forge API v2 Migration — Design

**Date:** 2026-07-22
**Status:** Draft — awaiting user review

## Goal

Remove **all** Laravel Forge API v1 code from the Raycast extension and replace it
with an API v2 integration. v1 is deprecated as of 2025-07-31. Preserve all current
features and add first-class **organization** support (v2 scopes everything under an
organization), including a settable default org and a per-action org override.

## Decisions

Confirmed with the user:

- **Approach A (adapter/normalization).** The v2 layer normalizes JSON:API responses
  back into the flat `IServer` / `ISite` / `IDeployment` shapes the UI already consumes,
  so only the `api/` + `lib/` + `types` layer changes. UI components stay largely intact.
- **Organization selection is in scope.** Settable default + per-action override.
- **Keep the second Forge account (API Key 2).** Existing users likely rely on it. It lets
  a user view two separate Forge *accounts* (two logins) merged into one list; unrelated to
  organizations. Each account independently enumerates its own orgs.

Made in the user's absence (flagged for confirmation on review):

- **Org default mechanism = "Both".** A preference textfield holds a base default org
  slug; an in-app org dropdown (populated live from `/orgs`) overrides per-action and can
  overwrite the saved default (stored in `LocalStorage`). Rationale: honors both the
  "set a default in settings" and "override per action" requests. *Revisit if undesired.*

## API v1 → v2 mapping

Base URL: `https://forge.laravel.com/api/v1` → `https://forge.laravel.com/api`.
Headers: `Accept: application/json`, `Content-Type: application/json`. Bearer auth unchanged.
Responses are **JSON:API**: `{ data: [{ id, type, attributes, relationships, links }], links, meta }`
with **cursor pagination** (`page[size]`, `page[cursor]` → `meta.next_cursor` / `links.next`).
The `{organization}` path segment is the **org slug** (string). Resource `id`s are **strings**.

| Feature | v1 | v2 |
|---|---|---|
| List orgs | — (new) | `GET /orgs` |
| List servers | `GET /servers` | `GET /orgs/{org}/servers` (no top-level servers endpoint) |
| List all sites | `GET /sites` | `GET /orgs/{org}/sites` |
| List server sites | `GET /servers/{s}/sites` | `GET /orgs/{org}/servers/{s}/sites` |
| Reboot server | `POST /servers/{s}/reboot` | `POST /orgs/{org}/servers/{s}/actions` body `{"action":"reboot"}` |
| Deploy site | `POST /servers/{s}/sites/{i}/deployment/deploy` | `POST /orgs/{org}/servers/{s}/sites/{i}/deployments` (bodyless) |
| Deploy history | `GET …/deployment-history` | `GET …/sites/{i}/deployments` |
| Deploy output | `GET …/deployment-history/{d}/output` | `GET …/deployments/{d}/log` → `data.attributes.output` |
| Env file | `GET …/env` (text) | `GET …/sites/{i}/environment` → `data.attributes.content` |
| Nginx file | `GET …/nginx` (text) | `GET …/sites/{i}/nginx` → `data.attributes.content` |

Notes:
- **No plain-text endpoints.** env/nginx now return JSON; drop `apiFetchText`.
- **Deployment `commit`** is a nested object `{ hash, author, message, branch }` (was flat
  `commit_hash` / `commit_author` / `commit_message`). Normalize to the existing flat fields.
- **Site `repository`** is a nested object `{ provider, url, branch, status }`. Normalize to
  `repository` (url), `repository_provider`, `repository_branch`, `repository_status`.
- **Site → server link** is in `relationships.server.data.id`. Servers carry no org back-link,
  so the fetch layer must remember the org context (see below).
- `SiteResource.attributes.deployment_status` still exists with a `deploying` state → the
  menu-bar deploy watcher keeps working. `SiteStatus`/`DeploymentStatus` enums are richer now.

## Architecture

### Org context is mandatory

Every server/site action URL needs the org slug, and a server object does not tell you its
org. Therefore the fetch layer enumerates orgs and **stamps each normalized server/site with
its `org_slug`** (mirroring how servers already carry `api_token_key` and `ssh_user`). Later
action calls read `org_slug` off the object to build URLs — no extra lookups.

### Fetch core (`lib/api.ts`)

- Keep the existing toast / reset-cache error flow.
- `apiFetch<T>(url, options)` — parse JSON:API JSON (unchanged signature; callers read `.data`).
- `fetchAllPages<T>(url, options)` — new helper that follows cursor pagination and concatenates
  `data` arrays until no next cursor. Used for orgs, servers, and site lists so large accounts
  aren't truncated.
- Drop `apiFetchText`.

### `api/Org.ts` (new)

- `getAll({ token })` → `GET /orgs` (paginated) → `{ id, slug, name }[]`.
- A small resolver used by hooks: given account token + optional override, produce the set of
  orgs to query (the selected/default org, or all orgs when "All organizations" is chosen).

### `api/Server.ts`

- `getAll()` — for each account token, list orgs, then `GET /orgs/{slug}/servers` per org
  (respecting the selected org filter), normalize `ServerResource` → `IServer`, stamp
  `org_slug`, `api_token_key`, `ssh_user`. Keeps the existing site-keyword enrichment for search.
- `reboot({ org, serverId, token })` → `POST /orgs/{org}/servers/{serverId}/actions`
  body `{ action: "reboot" }`.

### `api/Site.ts`

- `getSitesWithoutServer({ org, token })` → `GET /orgs/{org}/sites`, normalize + sort/filter.
- `getAll({ org, serverId, token })` → `GET /orgs/{org}/servers/{serverId}/sites`.
- `deploy({ org, serverId, siteId, token })` → `POST …/sites/{siteId}/deployments`.
- `getConfig({ org, serverId, siteId, token, type })` → `environment` | `nginx`,
  read `data.attributes.content`, trimmed.
- `getDeploymentHistory(...)` → `GET …/deployments`, normalize commit object → flat fields.
- `getDeploymentOutput(...)` → `GET …/deployments/{deploymentId}/log` → `data.attributes.output`.
- Normalization helpers map JSON:API resources → flat `ISite` / `IDeployment`.

### Normalization

One `normalizeServer(resource, ctx)`, `normalizeSite(resource, ctx)`,
`normalizeDeployment(resource)` per resource type, living in the `api/` layer. They read
`resource.id` + `resource.attributes` + `resource.relationships` and return the flat shapes.
`ctx` carries `org_slug` / `api_token_key` / `ssh_user`.

## Types (`types.ts`)

- Add `org_slug: string` to `IServer` and `ISite`.
- **IDs become `string`** (`IServer.id`, `ISite.id`, `ISite.server_id`, `IDeployment.id`,
  `IDeployment.server_id`, `IDeployment.site_id`). v2 resource ids are strings. Update the
  numeric comparisons in `check-deploy-status.tsx`, `SiteCommands`, and command arguments
  accordingly (mostly string-compare and `String(...)` calls already present).
- Prune fields that no longer exist in v2 and add the few new ones the UI shows (kept minimal
  for parity). `telegram_secret` scrubbing in `sortAndFilterSites` is dropped if the field is
  gone in v2.

## Organization UX

**Preferences (`package.json`):**
- Update the API-key preference descriptions to say a **v2 API token** is required (v1 tokens
  stop working).
- Add a single optional `default_organization` textfield (org slug) as the base default
  (not per-account — org slugs are effectively unique across the accounts a user configures).

**In-app dropdown ("Manage Servers" command):**
- A `List.Dropdown` in `searchBarAccessory`, populated from `/orgs` (across accounts), with an
  "All organizations" entry. Selection filters the server/site list to that org.
- Initial value resolution order: `LocalStorage` saved default → `default_organization`
  preference → "All organizations".
- Action **"Set as Default Organization"** persists the current selection to `LocalStorage`.
- The dropdown selection is the per-action override the user asked for; server/site actions
  use each object's stamped `org_slug`, so overriding the list scope is sufficient.

**Menu-bar command (`check-deploy-status`):** enumerates orgs per account (or the default org
if one is set) and aggregates sites via `getSitesWithoutServer`, unchanged in behavior.

## Hooks & components

- `useServers` — unchanged public shape; internally may accept the selected org.
- `useSites` / `useAllSites` / `useDeployments` / `useDeploymentOutput` — add `org_slug` to
  SWR keys and pass it into the `Site.*` calls.
- `ServerCommands` / `SiteCommands` — pass `org_slug` (already pass `serverId` + `token`).
- `useIsSiteOnline` — unchanged (uses site URL/aliases, not the Forge API).

## Fake data (`lib/faker.ts`, `api/Mock.ts`)

Update generators to produce the normalized flat shapes (with `org_slug`) so `USE_FAKE_DATA`
still exercises the list, deploy-status, and menu-bar states without hitting v2.

## Error handling

Keep the existing failure toast + "Reset cache" action. Add handling for 401 ("No valid API
key") with a message hinting the token must be a v2 token. 429 (rate limit) surfaces the
standard failure toast.

## Testing / verification

- `USE_FAKE_DATA` mode for menu-bar and list states.
- Manual `ray develop` against a real v2 token: list servers/sites, switch org, set default,
  view env + nginx, trigger a deploy, view deploy history + output, reboot a server, and
  confirm the menu-bar watcher shows a live deploy.
- `ray lint` / `ray build` clean.

## Out of scope (parity port)

Databases, scheduled jobs, firewall rules, certificates, integrations (Horizon/Octane/etc.),
server/site creation, and other new v2 endpoints. These can be follow-up work.

## Open questions

1. Confirm the two "absence" decisions: org default = "Both", and keep API Key 2.
2. Confirm feature-parity scope (no new v2 features beyond org selection).
