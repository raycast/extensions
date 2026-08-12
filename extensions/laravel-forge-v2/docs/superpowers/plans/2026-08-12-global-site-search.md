# Global Site Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone "Search Sites" Raycast command that lists every site across all servers/orgs/accounts so a user can find a site by typing its domain, without first selecting a server.

**Architecture:** A new `view` command (`search-sites`) renders a `SitesGlobalList` component. Sites are fetched globally via a new `useGlobalSites` hook (composing the existing `Site.getSitesWithoutServer` across both API tokens) and joined to the existing `useServers()` list by `server_id` so each site can open the existing `SiteSingle` info screen. Site→domain matching for the launch argument lives in a pure, unit-tested helper.

**Tech Stack:** TypeScript, React, Raycast API (`@raycast/api`), SWR, Vitest.

## Global Constraints

- Do not modify the existing `index` / `ServersList` command or the per-server `SitesList`.
- The global list must NOT use `useIsSiteOnline` (it HTTP-`HEAD`s each domain every second; a global list would create a request storm). Show status from already-loaded API data only.
- Support both accounts: preference keys `laravel_forge_api_key` and `laravel_forge_api_key_two` (second is optional).
- Forge server IDs are unique platform-wide; join sites to servers by `server_id` with no account qualifier.
- Only sites whose parent server resolves are shown (revoked servers are already filtered out of `useServers()`).
- Reuse existing helpers: `ALL_ORGS`, `resolveInitialOrg`, `setStoredDefaultOrg` (`src/lib/org.ts`); `getDeplymentStateIcon` (`src/lib/color.ts`); `unwrapToken` (`src/lib/auth.ts`); `Site.getSitesWithoutServer` (`src/api/Site.ts`).
- Vitest only picks up `src/**/*.test.ts` (not `.tsx`); pure logic must live in a `.ts` file to be testable.
- Quality gates (per project note, `ray lint` owner-validation fails locally): use `npx tsc --noEmit -p tsconfig.json`, `npx eslint <files>`, and `npx vitest run`.

**Note on spec refinement:** The approved spec listed a new `Site.getAllForAccounts()` method. This plan instead composes the *existing* `Site.getSitesWithoutServer` inside `useGlobalSites` (reading both token keys), which achieves the same result with no new API method (DRY/YAGNI). Same behavior, fewer moving parts.

---

### Task 1: Pure site-matching helper

Implements the launch-argument matching logic as a pure function so it is unit-testable independent of React/Raycast.

**Files:**
- Create: `src/lib/site-match.ts`
- Test: `src/lib/__tests__/site-match.test.ts`

**Interfaces:**
- Consumes: `ISite` from `src/types.ts` (fields used: `name: string`, `aliases: string[]`).
- Produces: `findBestSiteMatch(sites: ISite[], query: string): ISite | undefined` — returns the best match by precedence: (1) exact `name` (case-insensitive), (2) `name` contains query (case-insensitive), (3) any `aliases` entry exact or contains query (case-insensitive). Returns `undefined` when query is blank or nothing matches.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/site-match.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findBestSiteMatch } from "../site-match";
import type { ISite } from "../../types";

const site = (name: string, aliases: string[] = []): ISite =>
  ({ id: name, name, aliases } as unknown as ISite);

describe("findBestSiteMatch", () => {
  const sites = [
    site("api.acme.com"),
    site("app.acme.com", ["www.acme.com"]),
    site("acme.com"),
  ];

  it("prefers an exact name match over a substring match", () => {
    expect(findBestSiteMatch(sites, "acme.com")?.name).toBe("acme.com");
  });

  it("is case-insensitive", () => {
    expect(findBestSiteMatch(sites, "API.ACME.COM")?.name).toBe("api.acme.com");
  });

  it("falls back to a substring match on the name", () => {
    expect(findBestSiteMatch(sites, "app.")?.name).toBe("app.acme.com");
  });

  it("matches on an alias when no name matches", () => {
    expect(findBestSiteMatch(sites, "www.acme.com")?.name).toBe("app.acme.com");
  });

  it("returns undefined for a blank query", () => {
    expect(findBestSiteMatch(sites, "   ")).toBeUndefined();
  });

  it("returns undefined when nothing matches", () => {
    expect(findBestSiteMatch(sites, "nope.example")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/site-match.test.ts`
Expected: FAIL — cannot resolve import `../site-match` / `findBestSiteMatch is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/site-match.ts`:

```ts
import { ISite } from "../types";

// Find the site that best matches a typed domain, used by the Search Sites
// launch argument. Precedence: exact name > name substring > alias match.
export const findBestSiteMatch = (sites: ISite[], query: string): ISite | undefined => {
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;

  const byName = (predicate: (name: string) => boolean) =>
    sites.find((site) => predicate((site.name ?? "").toLowerCase()));

  const exact = byName((name) => name === needle);
  if (exact) return exact;

  const substring = byName((name) => name.includes(needle));
  if (substring) return substring;

  return sites.find((site) =>
    (site.aliases ?? []).some((alias) => {
      const value = alias.toLowerCase();
      return value === needle || value.includes(needle);
    })
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/site-match.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/site-match.ts src/lib/__tests__/site-match.test.ts
git commit -m "feat: add findBestSiteMatch helper for domain search"
```

---

### Task 2: Global sites hook

Fetches every site across both API tokens (each token covers all its orgs) and exposes them as one list.

**Files:**
- Create: `src/hooks/useGlobalSites.ts`

**Interfaces:**
- Consumes: `Site.getSitesWithoutServer({ token }): Promise<ISite[]>` (`src/api/Site.ts`, returns `[]` for an empty token); `unwrapToken(tokenKey: string): string` (`src/lib/auth.ts`); `ISite` from `src/types.ts`.
- Produces: `useGlobalSites(): { sites: ISite[] | undefined; loading: boolean; error: Error | undefined }`.

- [ ] **Step 1: Write the implementation**

Create `src/hooks/useGlobalSites.ts`:

```ts
import useSWR from "swr";
import { ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

// Preference keys for the (up to) two supported accounts. An empty/absent token
// makes getSitesWithoutServer return [], so the second account degrades cleanly.
const TOKEN_KEYS = ["laravel_forge_api_key", "laravel_forge_api_key_two"] as const;

const fetcher = async (): Promise<ISite[]> => {
  const perAccount = await Promise.all(
    TOKEN_KEYS.map((key) => Site.getSitesWithoutServer({ token: unwrapToken(key) }))
  );
  return perAccount.flat();
};

export const useGlobalSites = () => {
  const { data, error } = useSWR<ISite[]>("global-sites", fetcher, {
    refreshInterval: 60_000 * 5,
  });

  return {
    sites: data,
    loading: !error && !data,
    error: error as Error | undefined,
  };
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS (no errors referencing `useGlobalSites.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGlobalSites.ts
git commit -m "feat: add useGlobalSites hook aggregating sites across accounts"
```

---

### Task 3: Global sites list component

Renders the searchable list: joins sites to servers, provides the org dropdown, uses lightweight rows (no live online ping), and jumps straight to a site when the `domain` launch argument is supplied.

**Files:**
- Create: `src/components/sites/SitesGlobalList.tsx`

**Interfaces:**
- Consumes: `useServers()` → `{ servers: IServer[] | undefined; loading; error }` (`src/hooks/useServers.ts`); `useGlobalSites()` from Task 2; `findBestSiteMatch` from Task 1; `SiteSingle` (`{ site: ISite; server: IServer }`); `SiteCommands`/`ServerCommands`; `getDeplymentStateIcon(status: string)` (`src/lib/color.ts`); `EmptyView` (`{ title: string }`); org helpers `ALL_ORGS`, `resolveInitialOrg`, `setStoredDefaultOrg`.
- Produces: `SitesGlobalList({ search }: { search: string })` — default export not required; named export.

- [ ] **Step 1: Write the component**

Create `src/components/sites/SitesGlobalList.tsx`:

```tsx
import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { IServer, ISite } from "../../types";
import { useServers } from "../../hooks/useServers";
import { useGlobalSites } from "../../hooks/useGlobalSites";
import { EmptyView } from "../EmptyView";
import { SiteSingle } from "./SiteSingle";
import { SiteCommands } from "../actions/SiteCommands";
import { ServerCommands } from "../actions/ServerCommands";
import { getDeplymentStateIcon } from "../../lib/color";
import { findBestSiteMatch } from "../../lib/site-match";
import { ALL_ORGS, resolveInitialOrg, setStoredDefaultOrg } from "../../lib/org";

export const SitesGlobalList = ({ search }: { search: string }) => {
  const { servers, loading: serversLoading, error: serversError } = useServers();
  const { sites, loading: sitesLoading, error: sitesError } = useGlobalSites();
  const [selectedOrg, setSelectedOrg] = useState<string>(ALL_ORGS);
  const [incomingSearch, setIncomingSearch] = useState(search);
  const { push } = useNavigation();

  const loading = serversLoading || sitesLoading;
  const error = serversError || sitesError;

  useEffect(() => {
    resolveInitialOrg().then(setSelectedOrg);
  }, []);

  // Index servers by id so each site can resolve its parent server object.
  const serversById = useMemo(() => {
    const map = new Map<string, IServer>();
    servers?.forEach((s) => map.set(s.id.toString(), s));
    return map;
  }, [servers]);

  // Only sites whose server resolves can open the full info screen; drop orphans
  // (e.g. sites on revoked servers, which useServers already filters out).
  const resolvableSites = useMemo(
    () => (sites ?? []).filter((site) => site.server_id && serversById.has(site.server_id.toString())),
    [sites, serversById]
  );

  const orgs = useMemo(() => {
    const set = new Set<string>();
    resolvableSites.forEach((s) => s.org_slug && set.add(s.org_slug));
    return [...set].sort();
  }, [resolvableSites]);

  // If the resolved default org isn't present, fall back to All.
  useEffect(() => {
    if (selectedOrg !== ALL_ORGS && orgs.length > 0 && !orgs.includes(selectedOrg)) {
      setSelectedOrg(ALL_ORGS);
    }
  }, [orgs, selectedOrg]);

  const visibleSites = useMemo(() => {
    if (selectedOrg === ALL_ORGS) return resolvableSites;
    return resolvableSites.filter((s) => s.org_slug === selectedOrg);
  }, [resolvableSites, selectedOrg]);

  // Launch argument: jump straight to the best-matching site once data is loaded.
  useEffect(() => {
    if (!incomingSearch || loading) return;
    const site = findBestSiteMatch(resolvableSites, incomingSearch);
    if (!site) return;
    const server = serversById.get(site.server_id.toString());
    if (!server) return;
    showToast(Toast.Style.Success, `Now showing: ${site.name ?? `#${site.id}`}`);
    push(<SiteSingle site={site} server={server} />);
    setIncomingSearch("");
  }, [incomingSearch, loading, resolvableSites, serversById]);

  const saveDefaultOrg = async () => {
    await setStoredDefaultOrg(selectedOrg);
    await showToast(
      Toast.Style.Success,
      selectedOrg === ALL_ORGS ? "Default set to: All organizations" : `Default organization: ${selectedOrg}`
    );
  };

  if (error) {
    const message = typeof error === "string" ? error : error.message;
    return <EmptyView title={`Error: ${message}`} />;
  }
  if (!loading && visibleSites.length === 0) {
    return <EmptyView title="No sites found" />;
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search sites..."
      searchBarAccessory={
        <List.Dropdown tooltip="Organization" value={selectedOrg} onChange={setSelectedOrg}>
          <List.Dropdown.Item title="All organizations" value={ALL_ORGS} />
          {orgs.map((org) => (
            <List.Dropdown.Item key={org} title={org} value={org} />
          ))}
        </List.Dropdown>
      }
    >
      {visibleSites.map((site) => {
        const server = serversById.get(site.server_id.toString());
        if (!server) return null;
        return (
          <SiteGlobalListItem key={site.id} site={site} server={server} onSetDefaultOrg={saveDefaultOrg} />
        );
      })}
    </List>
  );
};

const SiteGlobalListItem = ({
  site,
  server,
  onSetDefaultOrg,
}: {
  site: ISite;
  server: IServer;
  onSetDefaultOrg: () => void;
}) => {
  if (!site?.id) return null;
  // Status from already-loaded API data only — no live online HTTP check here.
  const state = getDeplymentStateIcon(site.deployment_status || "connected");
  return (
    <List.Item
      id={site.id.toString()}
      key={site.id}
      keywords={site.aliases}
      title={site.name ?? "Site name undefined"}
      subtitle={site.repository ?? ""}
      icon={state.icon}
      accessories={[{ text: site.org_slug ?? "" }, { text: state.text }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="Open Site Info" icon={Icon.Binoculars} target={<SiteSingle site={site} server={server} />} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Site Commands">
            <SiteCommands site={site} server={server} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Server Commands">
            <ServerCommands server={server} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Organization">
            <Action icon={Icon.Star} title="Set Selected Org as Default" onAction={onSetDefaultOrg} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npx eslint src/components/sites/SitesGlobalList.tsx`
Expected: PASS (no errors). If `@raycast/prefer-title-case` or similar flags a title, fix the casing to satisfy it.

- [ ] **Step 4: Commit**

```bash
git add src/components/sites/SitesGlobalList.tsx
git commit -m "feat: add SitesGlobalList component with org filter and domain jump"
```

---

### Task 4: Wire up the Search Sites command

Adds the command entry point and registers it in the Raycast manifest with its `domain` launch argument.

**Files:**
- Create: `src/search-sites.tsx`
- Modify: `package.json` (add a command to the `commands` array)

**Interfaces:**
- Consumes: `SitesGlobalList({ search })` from Task 3; `cacheProvider` (`src/lib/cache.ts`, exported as `cacheProvider`); `LaunchProps` from `@raycast/api`.
- Produces: default-exported Raycast command component.

- [ ] **Step 1: Create the entry point**

Create `src/search-sites.tsx` (mirrors `src/index.tsx`):

```tsx
import { SWRConfig } from "swr";
import { cacheProvider as provider } from "./lib/cache";
import { SitesGlobalList } from "./components/sites/SitesGlobalList";
import { LaunchProps } from "@raycast/api";

interface Arguments {
  domain: string;
}

const SearchSites = (props: LaunchProps<{ arguments: Arguments }>) => {
  const { domain } = props.arguments;
  return (
    <SWRConfig value={{ provider }}>
      <SitesGlobalList search={domain} />
    </SWRConfig>
  );
};

export default SearchSites;
```

- [ ] **Step 2: Register the command in `package.json`**

In the `commands` array, add this object immediately after the existing `index` command object (before `check-deploy-status`):

```json
    {
      "name": "search-sites",
      "title": "Search Sites",
      "subtitle": "Laravel Forge V2",
      "icon": "command-icon.png",
      "description": "Search and open your Laravel Forge sites by domain across every server",
      "mode": "view",
      "arguments": [
        {
          "name": "domain",
          "placeholder": "Domain",
          "type": "text",
          "required": false
        }
      ]
    },
```

Ensure the trailing comma is correct (the object before `check-deploy-status` must be comma-separated).

- [ ] **Step 3: Verify manifest is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid')"`
Expected: prints `valid`.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/search-sites.tsx`
Expected: PASS.

- [ ] **Step 5: Full test suite**

Run: `npx vitest run`
Expected: PASS (existing tests + Task 1's 6 tests).

- [ ] **Step 6: Manual verification in Raycast**

Run: `npm run dev` (starts `ray develop`). In Raycast:
1. Open **Search Sites** with no argument → the list shows sites from all servers/orgs; the org dropdown filters; typing a domain filters rows.
2. Open **Search Sites** with a domain argument (e.g. an exact site domain) → it pushes straight to that site's info screen with a success toast.
3. Open a site → confirm deploy / env / nginx / deploy history all work (server was joined correctly).
Stop with Ctrl-C when done.

- [ ] **Step 7: Commit**

```bash
git add src/search-sites.tsx package.json
git commit -m "feat: register Search Sites command with domain launch argument"
```

---

## Self-Review Notes

- **Spec coverage:** New command (Task 4) ✓; full site info via `SiteSingle` join (Task 3) ✓; org dropdown mirror (Task 3) ✓; domain launch argument (Tasks 1 + 3 + 4) ✓; lighter rows / no online ping (Task 3, `getDeplymentStateIcon` without `useIsSiteOnline`) ✓; both accounts (Task 2) ✓; `findBestSiteMatch` unit tests (Task 1) ✓. The spec's `Site.getAllForAccounts` is intentionally replaced by composing `getSitesWithoutServer` in `useGlobalSites` (documented above).
- **Type consistency:** `findBestSiteMatch(sites, query)` used identically in Task 1 and Task 3; `useGlobalSites()` return shape consumed as defined in Task 3; `SiteSingle`/`SiteCommands`/`ServerCommands` prop shapes match their existing definitions; `cacheProvider` import name matches `src/lib/cache.ts`.
- **Orphan sites:** filtered in both the render map and the launch-argument matcher via `resolvableSites`.
