# Global Site Search — Design

**Date:** 2026-08-12
**Status:** Approved

## Problem

In the v1 extension you could type a site's domain at the top level and it would
find the site directly. In v2 the top-level command (`index` → `ServersList`)
lists **servers only**. Sites are only fetched per-server: you must select a
server (`ServerSingle`) before its `SitesList` loads, so you cannot find a site
without first knowing which server hosts it.

The data-fetching capability to list all sites globally already exists
(`Site.getSitesWithoutServer`, wrapped by `useAllSites`) but is only wired to the
menu-bar deploy watcher (`check-deploy-status`). It is not exposed in the search
UI. The gap is UI wiring, not API.

## Goal

Restore the v1 "type a domain, find the site" behavior via a dedicated,
server-independent site search, without changing the existing Manage Servers
command.

## Decisions

1. **Separate command** — add a new `Search Sites` Raycast command rather than
   toggling or combining lists inside Manage Servers. Leaves the existing command
   untouched.
2. **Full site info** — selecting a site opens the existing `SiteSingle` screen
   (deploy, env/nginx, deploy history, site + server commands). This requires
   joining each site to its parent server object.
3. **Org dropdown** — mirror Manage Servers' organization dropdown (All
   organizations / per-org, plus "set default org").
4. **Domain launch argument** — the command takes an optional `domain` argument
   so a domain typed from the Raycast root jumps straight to the matching site.
5. **Lighter list rows (no live online ping)** — the global list must NOT use the
   per-second `useIsSiteOnline` HTTP `HEAD` check that per-server `SiteListItem`
   uses; see Design §4.

## Design

### 1. New Raycast command (`package.json`)

Add a second `view` command alongside `index`:

```jsonc
{
  "name": "search-sites",
  "title": "Search Sites",
  "subtitle": "Laravel Forge V2",
  "icon": "command-icon.png",
  "description": "Search all your Laravel Forge sites by domain across every server",
  "mode": "view",
  "arguments": [
    { "name": "domain", "placeholder": "Domain", "type": "text", "required": false }
  ]
}
```

### 2. Entry point — `src/search-sites.tsx`

Mirrors `index.tsx`: wraps `SWRConfig` with the cache provider and renders
`<SitesGlobalList search={domain} />`.

### 3. Data layer

- **`Site.getAllForAccounts()`** (new, `src/api/Site.ts`) — reads preferences for
  both API keys (like `Server.getAll`), calls the existing
  `Site.getSitesWithoutServer({ token })` per account, merges and sorts. Sites do
  not need to carry which token they belong to: the parent server object (from
  `useServers`) carries `api_token_key`, and we resolve the server by `server_id`.
- **`useGlobalSites()`** (new hook, `src/hooks/useGlobalSites.ts`) — SWR wrapper
  keyed `"global-sites"`, `refreshInterval` ~5 min (same cadence as `useAllSites`).
- **Join to servers** — the list also calls the existing `useServers()` and builds
  a `Map<server_id, IServer>`. Each site resolves its parent server by
  `server_id`. Forge server IDs are unique platform-wide, so there is no
  cross-account collision even with two API tokens.
- **Orphan handling** — `useServers()` already filters out revoked servers, so
  their sites cannot resolve a server object and are **hidden** from the list
  (they could not open the full info screen anyway).
- **Loading** — the list is loading while either servers or sites are still
  loading.

### 4. List component — `src/components/sites/SitesGlobalList.tsx`

- `List` with `searchBarPlaceholder="Search sites..."`.
- **Org dropdown** reusing `ALL_ORGS`, `resolveInitialOrg`, `setStoredDefaultOrg`
  from `src/lib/org` — identical UX to `ServersList` (All organizations / per-org
  + "set default org"). `orgs` derived from the sites' `org_slug`.
- Each row shows domain (title), repository/app (subtitle), org (accessory), and
  pushes `SiteSingle site={site} server={resolvedServer}`.
- **Site status — lighter row.** The per-server `SiteListItem` calls
  `useIsSiteOnline` per row, which HTTP-`HEAD`s each domain every second
  (`refreshInterval: 1_000`). Safe per-server, but a global list of every site
  would mount hundreds of these simultaneously — a request storm. The global row
  therefore shows status from already-loaded API data (`site.status` /
  `site.deployment_status`) with **no live online ping**. The live check still
  runs on the single-site info screen (`SiteSingle`) as it does today.

### 5. Domain launch argument

On mount, if `domain` was passed and both sites and servers are loaded, find the
best match and auto-push its `SiteSingle` with a success toast (mirrors the
`incomingSearch` effect in `ServersList`). Empty argument → just show the list.

Match precedence (case-insensitive), in a small pure helper `findBestSiteMatch`
so it is unit-testable:

1. Exact `site.name === domain`
2. Substring: `site.name` includes `domain`
3. Alias match: any `site.aliases` entry exact or includes `domain`

Only matches whose parent server resolves are eligible (needed to open
`SiteSingle`).

### 6. Tests

- Unit test `findBestSiteMatch`: exact > substring > alias precedence,
  case-insensitivity, and no-match returns undefined.
- Existing `api.test.ts` / `normalize.test.ts` cover the fetch/normalize path; add
  a small merge test for `Site.getAllForAccounts` if cleanly mockable, otherwise
  rely on existing `getSitesWithoutServer` coverage.

## Files

- **New:** `src/search-sites.tsx`, `src/components/sites/SitesGlobalList.tsx`,
  `src/hooks/useGlobalSites.ts`
- **Changed:** `package.json` (command + argument), `src/api/Site.ts`
  (`getAllForAccounts`)
- **Tests:** new spec for `findBestSiteMatch`

## Out of scope

- Changing the existing Manage Servers command or its server-scoped
  `SitesList`.
- Live online-status pinging in the global list (deliberately excluded for
  performance; unchanged on the single-site screen).
