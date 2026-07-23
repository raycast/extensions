# Laravel Forge API v2 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Laravel Forge API v1 code from the Raycast extension and replace it with an API v2 integration, adding organization support (settable default + per-action override).

**Architecture:** Adapter/normalization approach. The `api/` + `lib/` layer fetches v2 JSON:API responses and normalizes each `{id, attributes, relationships}` resource back into the existing flat `IServer` / `ISite` / `IDeployment` shapes the UI already consumes. UI components change only where they must thread the new `org_slug` through, add the org dropdown, and pass the org into reboot/deploy/config calls.

**Tech Stack:** TypeScript, React, `@raycast/api`, `@raycast/utils`, `swr`, `node-fetch`, `date-fns`. Tests: `vitest` (added by Task 1) for the pure normalization/pagination logic. UI wiring is verified with `tsc --noEmit`, `ray lint`, `ray build`, and manual `ray develop`.

## Global Constraints

- **Runner:** All commands run from the `laravel-forge/` directory. Use the repo scripts: `npm run lint` (→ `ray lint`), `npm run build` (→ `ray build -e dist`), `npm run dev` (→ `ray develop`). Typecheck with `npx tsc --noEmit`. Unit tests with `npm test` (→ `vitest run`, added Task 1).
- **API base URL:** `https://forge.laravel.com/api` (no version segment).
- **Required headers on every request:** `Accept: application/json`, `Content-Type: application/json`, `Authorization: Bearer <token>`.
- **Response format:** JSON:API — lists are `{ data: Resource[], links, meta }`, singles are `{ data: Resource }`. Each resource is `{ id: string, type, attributes, relationships?, links? }`. Pagination is cursor-based; follow `links.next` (a full URL, `null` when exhausted).
- **Org path segment is the org slug** (string). All server/site endpoints are under `/orgs/{org}/…`. There is no top-level `/servers` endpoint.
- **Resource ids are strings.** Internal `IServer.id`, `ISite.id`, `ISite.server_id`, `IDeployment.id` are `string`.
- **Two-account feature is retained.** `laravel_forge_api_key` (+ optional `laravel_forge_api_key_two`) each enumerate their own orgs.
- **Never add a `Co-Authored-By` line to commits** (user global rule). Plain `git` only.
- **Do not change UI field names** in `IServer`/`ISite`/`IDeployment` beyond what this plan specifies; the normalizers must populate the exact field names the components already read.

---

### Task 1: Add the vitest test harness

**Files:**
- Modify: `package.json` (devDependencies + `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` runs `vitest run`; a `*.test.ts` file anywhere under `src/` is picked up.

- [ ] **Step 1: Add vitest as a dev dependency**

Run:
```bash
cd laravel-forge && npm install -D vitest@^1.6.0
```
Expected: `vitest` appears under `devDependencies` in `package.json`; install completes without errors.

- [ ] **Step 2: Add the `test` script**

In `package.json`, add to the `"scripts"` object (leave existing scripts untouched):
```json
"test": "vitest run"
```

- [ ] **Step 3: Create the vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Write a smoke test that fails first**

Create `src/lib/__tests__/smoke.test.ts`:
```ts
import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(3);
  });
});
```

- [ ] **Step 5: Run it and confirm it fails**

Run: `cd laravel-forge && npm test`
Expected: FAIL — `expected 2 to be 3`.

- [ ] **Step 6: Fix the assertion**

Edit `src/lib/__tests__/smoke.test.ts` line `expect(1 + 1).toBe(3);` → `expect(1 + 1).toBe(2);`.

- [ ] **Step 7: Run it and confirm it passes**

Run: `cd laravel-forge && npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 8: Confirm the build ignores test files**

Run: `cd laravel-forge && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd laravel-forge && git add package.json package-lock.json vitest.config.ts src/lib/__tests__/smoke.test.ts && git commit -m "chore: add vitest test harness"
```

---

### Task 2: Update config, headers, and extension preferences

**Files:**
- Modify: `src/config.ts`
- Modify: `package.json` (preferences + preference descriptions)

**Interfaces:**
- Produces: `FORGE_API_URL = "https://forge.laravel.com/api"`; a new `default_organization` preference key.

- [ ] **Step 1: Point the base URL at v2**

Edit `src/config.ts`. Replace line 2:
```ts
export const FORGE_API_URL = "https://forge.laravel.com/api/v1";
```
with:
```ts
export const FORGE_API_URL = "https://forge.laravel.com/api";
```
Leave `API_RATE_LIMIT` and `USE_FAKE_DATA` unchanged.

- [ ] **Step 2: Update the API key preference descriptions to mention v2 tokens**

In `package.json`, in the `preferences` array, change the `description` of `laravel_forge_api_key` to:
```
"Generate a v2 API token from your Laravel Forge profile (v1 tokens no longer work)"
```
and the `description` of `laravel_forge_api_key_two` to:
```
"Optionally add a second account using its v2 API token."
```

- [ ] **Step 3: Add the default-organization preference**

In `package.json`, append this object to the `preferences` array (after `laravel_forge_ssh_user_two`):
```json
{
  "name": "default_organization",
  "type": "textfield",
  "required": false,
  "title": "Default Organization",
  "description": "Optional. Organization slug to show by default. Leave empty to show all organizations.",
  "placeholder": "acme"
}
```

- [ ] **Step 4: Verify the manifest is valid**

Run: `cd laravel-forge && npx tsc --noEmit && npm run lint`
Expected: no errors. (If `ray lint` validates the manifest, a malformed preferences array fails here.)

- [ ] **Step 5: Commit**

```bash
cd laravel-forge && git add src/config.ts package.json && git commit -m "feat: point config at API v2 and add default organization preference"
```

---

### Task 3: JSON:API types and paginated fetch core

**Files:**
- Create: `src/lib/jsonapi.ts`
- Modify: `src/lib/api.ts`
- Create: `src/lib/__tests__/api.test.ts`

**Interfaces:**
- Produces:
  - `JsonApiResource<A>`, `JsonApiList<A>`, `JsonApiSingle<A>` types.
  - `ServerAttributes`, `SiteAttributes`, `DeploymentAttributes`, `ContentAttributes`, `OrgAttributes` types.
  - `authHeaders(token: string): Record<string,string>` in `lib/api.ts`.
  - `apiFetch<T>(url, options?): Promise<T>` (unchanged signature; still parses JSON).
  - `fetchAllPages<A>(url: string, options?: RequestInit): Promise<JsonApiResource<A>[]>` — follows `links.next`.
- Consumes: `FORGE_API_URL` (not directly here, callers build URLs).

- [ ] **Step 1: Create the JSON:API type module**

Create `src/lib/jsonapi.ts`:
```ts
export interface ResourceIdentifier {
  id: string;
  type: string;
}

export interface JsonApiResource<A> {
  id: string;
  type: string;
  attributes: A;
  relationships?: Record<string, { data?: ResourceIdentifier | null }>;
  links?: Record<string, string>;
}

export interface JsonApiList<A> {
  data: JsonApiResource<A>[];
  links?: { first?: string | null; last?: string | null; prev?: string | null; next?: string | null };
  meta?: { per_page?: number; next_cursor?: string | null; prev_cursor?: string | null };
}

export interface JsonApiSingle<A> {
  data: JsonApiResource<A>;
}

export interface OrgAttributes {
  name: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServerAttributes {
  id: number;
  credential_id?: number | null;
  name?: string;
  slug?: string;
  type?: string;
  ubuntu_version?: string | null;
  ssh_port?: number;
  provider?: string;
  identifier?: string | null;
  size?: string;
  region?: string;
  php_version?: string | null;
  php_cli_version?: string | null;
  opcache_status?: string | null;
  database_type?: string | null;
  db_status?: string | null;
  redis_status?: string | null;
  ip_address?: string | null;
  private_ip_address?: string | null;
  revoked?: boolean;
  created_at?: string;
  connection_status?: string | null;
  timezone?: string;
  local_public_key?: string | null;
  is_ready?: boolean;
}

export interface SiteRepository {
  provider?: string;
  url?: string | null;
  branch?: string | null;
  status?: string | null;
}

export interface SiteAttributes {
  name?: string;
  status?: string;
  url?: string;
  user?: string;
  https?: boolean;
  web_directory?: string;
  root_directory?: string | null;
  aliases?: string[];
  php_version?: string;
  deployment_status?: string | null;
  quick_deploy?: boolean | null;
  isolated?: boolean;
  repository?: SiteRepository | null;
  app_type?: string | null;
  deployment_url?: string;
  wildcards?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DeploymentCommit {
  hash?: string | null;
  author?: string | null;
  message?: string | null;
  branch?: string | null;
}

export interface DeploymentAttributes {
  commit?: DeploymentCommit | null;
  type?: string;
  status?: string;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContentAttributes {
  content: string;
}

export interface DeploymentOutputAttributes {
  output: string;
}
```

- [ ] **Step 2: Write failing tests for `fetchAllPages` and `authHeaders`**

Create `src/lib/__tests__/api.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { authHeaders, fetchAllPages } from "../api";
import type { JsonApiList } from "../jsonapi";

// node-fetch is imported by lib/api; mock it so no real network happens.
vi.mock("node-fetch", () => {
  return { default: vi.fn() };
});
import fetch from "node-fetch";
const mockedFetch = fetch as unknown as ReturnType<typeof vi.fn>;

const page = (data: unknown[], next: string | null): JsonApiList<unknown> => ({
  data: data as never,
  links: { next },
});

const okResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
});

afterEach(() => {
  mockedFetch.mockReset();
});

describe("authHeaders", () => {
  it("includes JSON headers and a bearer token", () => {
    expect(authHeaders("abc")).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
  });
});

describe("fetchAllPages", () => {
  it("concatenates every page until links.next is null", async () => {
    mockedFetch
      .mockResolvedValueOnce(okResponse(page([{ id: "1" }], "https://next-2")))
      .mockResolvedValueOnce(okResponse(page([{ id: "2" }], null)));

    const all = await fetchAllPages("https://start", { method: "get" });

    expect(all.map((r) => (r as { id: string }).id)).toEqual(["1", "2"]);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(mockedFetch.mock.calls[1][0]).toBe("https://next-2");
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `cd laravel-forge && npm test`
Expected: FAIL — `authHeaders`/`fetchAllPages` are not exported from `../api`.

- [ ] **Step 4: Extend `lib/api.ts`**

Edit `src/lib/api.ts`. Add the import at the top (after the existing imports):
```ts
import { JsonApiList, JsonApiResource } from "./jsonapi";
```
Leave `apiFetchText` in place for now (Site.ts still imports it until Task 6; it is removed in Task 10 once unused). Append at the end of the file:
```ts
export const authHeaders = (token: string): Record<string, string> => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
});

export const fetchAllPages = async <A>(url: string, options?: RequestInit): Promise<JsonApiResource<A>[]> => {
  const results: JsonApiResource<A>[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const page: JsonApiList<A> = await apiFetch<JsonApiList<A>>(nextUrl, options);
    results.push(...(page?.data ?? []));
    nextUrl = page?.links?.next ?? null;
  }
  return results;
};
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `cd laravel-forge && npm test`
Expected: PASS — all tests green.

- [ ] **Step 6: Typecheck (clean)**

Run: `cd laravel-forge && npx tsc --noEmit`
Expected: NO errors. `apiFetchText` is still exported and still used by `Site.ts`, so the tree compiles. The new helpers are additive.

- [ ] **Step 7: Commit**

```bash
cd laravel-forge && git add src/lib/jsonapi.ts src/lib/api.ts src/lib/__tests__/api.test.ts && git commit -m "feat: add JSON:API types and paginated fetch core"
```

---

### Task 4: Resource types, normalizers, and mock data

**Files:**
- Modify: `src/types.ts`
- Create: `src/api/normalize.ts`
- Create: `src/api/__tests__/normalize.test.ts`
- Modify: `src/lib/faker.ts`
- Modify: `src/api/Mock.ts`

**Interfaces:**
- Consumes: `JsonApiResource`, `ServerAttributes`, `SiteAttributes`, `DeploymentAttributes` from `lib/jsonapi.ts`.
- Produces:
  - Updated `IServer` / `ISite` / `IDeployment` (string ids, `org_slug`).
  - `toForgeTimestamp(value?: string | null): string | undefined`
  - `normalizeServer(resource, ctx: { org_slug; api_token_key; ssh_user }): IServer`
  - `normalizeSite(resource, ctx: { org_slug }): ISite`
  - `normalizeDeployment(resource, ctx?: { server_id?; site_id? }): IDeployment`

- [ ] **Step 1: Rewrite `types.ts`**

Replace the entire contents of `src/types.ts` with:
```ts
export interface IServer {
  api_token_key: string;
  ssh_user: string;
  org_slug: string;
  id: string;
  credential_id?: string | null;
  name?: string;
  type?: string;
  provider?: string;
  provider_id?: string | null;
  size?: string;
  region?: string;
  ubuntu_version?: string | null;
  db_status?: string | null;
  redis_status?: string | null;
  php_version?: string | null;
  opcache_status?: string | null;
  php_cli_version?: string | null;
  database_type?: string | null;
  ip_address?: string | null;
  ssh_port?: number;
  private_ip_address?: string | null;
  local_public_key?: string | null;
  connection_status?: string | null;
  timezone?: string;
  revoked?: boolean;
  created_at?: string;
  is_ready?: boolean;
  tags?: string[];
  keywords?: string[];
}

export interface ISite {
  id: string;
  server_id: string;
  org_slug: string;
  name?: string;
  aliases?: string[];
  directory?: string;
  wildcards?: boolean;
  status?: string;
  repository?: string;
  repository_provider?: string;
  repository_branch?: string;
  repository_status?: string;
  quick_deploy?: boolean;
  deployment_status?: string | null;
  is_online?: boolean;
  project_type?: string;
  php_version?: string;
  app?: string | null;
  created_at?: string;
  username?: string;
  deployment_url?: string;
  is_secured?: boolean;
  tags?: string[];
}

export type ConfigFile = "env" | "nginx";

export interface IDeployment {
  id: string;
  server_id?: string;
  site_id?: string;
  type?: string;
  commit_hash?: string;
  commit_author?: string;
  commit_message?: string;
  started_at?: string;
  ended_at?: string;
  status?: string;
  displayable_type?: string;
}
```

- [ ] **Step 2: Write failing normalizer tests**

Create `src/api/__tests__/normalize.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { normalizeDeployment, normalizeServer, normalizeSite, toForgeTimestamp } from "../normalize";
import type { DeploymentAttributes, ServerAttributes, SiteAttributes } from "../../lib/jsonapi";
import type { JsonApiResource } from "../../lib/jsonapi";

describe("toForgeTimestamp", () => {
  it("reformats ISO-8601 into space-separated UTC that survives a ' UTC' suffix", () => {
    const out = toForgeTimestamp("2025-07-29T09:00:00Z");
    expect(out).toBe("2025-07-29 09:00:00");
    expect(isNaN(new Date(out + " UTC").getTime())).toBe(false);
  });
  it("returns undefined for null/empty/invalid", () => {
    expect(toForgeTimestamp(null)).toBeUndefined();
    expect(toForgeTimestamp("")).toBeUndefined();
    expect(toForgeTimestamp("not-a-date")).toBeUndefined();
  });
});

describe("normalizeServer", () => {
  it("flattens attributes and stamps context", () => {
    const resource: JsonApiResource<ServerAttributes> = {
      id: "42",
      type: "servers",
      attributes: {
        id: 42,
        name: "web-1",
        provider: "aws",
        identifier: "i-123",
        ip_address: "1.2.3.4",
        ssh_port: 22,
        revoked: false,
        is_ready: true,
        credential_id: 7,
        created_at: "2025-07-29T09:00:00Z",
      },
    };
    const server = normalizeServer(resource, { org_slug: "acme", api_token_key: "k1", ssh_user: "forge" });
    expect(server.id).toBe("42");
    expect(server.org_slug).toBe("acme");
    expect(server.api_token_key).toBe("k1");
    expect(server.ssh_user).toBe("forge");
    expect(server.provider).toBe("aws");
    expect(server.provider_id).toBe("i-123");
    expect(server.ip_address).toBe("1.2.3.4");
    expect(server.credential_id).toBe("7");
    expect(server.created_at).toBe("2025-07-29 09:00:00");
  });
});

describe("normalizeSite", () => {
  it("flattens repository object and reads server id from relationships", () => {
    const resource: JsonApiResource<SiteAttributes> = {
      id: "99",
      type: "sites",
      attributes: {
        name: "example.com",
        status: "installed",
        user: "forge",
        https: true,
        web_directory: "/public",
        aliases: ["www.example.com"],
        deployment_status: "deploying",
        quick_deploy: true,
        deployment_url: "https://hook",
        app_type: "php",
        repository: { provider: "github", url: "org/repo", branch: "main", status: "installed" },
      },
      relationships: { server: { data: { id: "42", type: "servers" } } },
    };
    const site = normalizeSite(resource, { org_slug: "acme" });
    expect(site.id).toBe("99");
    expect(site.server_id).toBe("42");
    expect(site.org_slug).toBe("acme");
    expect(site.username).toBe("forge");
    expect(site.is_secured).toBe(true);
    expect(site.directory).toBe("/public");
    expect(site.repository).toBe("org/repo");
    expect(site.repository_branch).toBe("main");
    expect(site.repository_provider).toBe("github");
    expect(site.deployment_status).toBe("deploying");
    expect(site.project_type).toBe("php");
  });
  it("leaves repository undefined when there is no repo", () => {
    const resource: JsonApiResource<SiteAttributes> = {
      id: "5",
      type: "sites",
      attributes: { name: "static.example.com", repository: null },
      relationships: { server: { data: null } },
    };
    const site = normalizeSite(resource, { org_slug: "acme" });
    expect(site.repository).toBeUndefined();
    expect(site.server_id).toBe("");
  });
});

describe("normalizeDeployment", () => {
  it("flattens the commit object and reformats timestamps", () => {
    const resource: JsonApiResource<DeploymentAttributes> = {
      id: "1000",
      type: "deployments",
      attributes: {
        commit: { hash: "abc123", author: "Jane", message: "Fix bug", branch: "main" },
        type: "web",
        status: "finished",
        started_at: "2025-07-29T09:00:00Z",
        ended_at: "2025-07-29T09:01:30Z",
      },
    };
    const d = normalizeDeployment(resource, { server_id: "42", site_id: "99" });
    expect(d.id).toBe("1000");
    expect(d.commit_hash).toBe("abc123");
    expect(d.commit_author).toBe("Jane");
    expect(d.commit_message).toBe("Fix bug");
    expect(d.displayable_type).toBe("web");
    expect(d.status).toBe("finished");
    expect(d.started_at).toBe("2025-07-29 09:00:00");
    expect(d.ended_at).toBe("2025-07-29 09:01:30");
    expect(d.server_id).toBe("42");
    expect(d.site_id).toBe("99");
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `cd laravel-forge && npm test`
Expected: FAIL — `../normalize` cannot be found.

- [ ] **Step 4: Implement the normalizers**

Create `src/api/normalize.ts`:
```ts
import {
  DeploymentAttributes,
  JsonApiResource,
  ServerAttributes,
  SiteAttributes,
} from "../lib/jsonapi";
import { IDeployment, IServer, ISite } from "../types";

// v2 returns ISO-8601 timestamps ("2025-07-29T09:00:00Z"). Several components build
// dates with `new Date(value + " UTC")`, which fails on ISO strings. Reformat to
// "YYYY-MM-DD HH:MM:SS" in UTC so appending " UTC" parses correctly.
export const toForgeTimestamp = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 19).replace("T", " ");
};

type ServerCtx = { org_slug: string; api_token_key: string; ssh_user: string };

export const normalizeServer = (resource: JsonApiResource<ServerAttributes>, ctx: ServerCtx): IServer => {
  const a = resource.attributes ?? ({} as ServerAttributes);
  return {
    id: resource.id,
    org_slug: ctx.org_slug,
    api_token_key: ctx.api_token_key,
    ssh_user: ctx.ssh_user,
    credential_id: a.credential_id != null ? String(a.credential_id) : null,
    name: a.name,
    type: a.type,
    provider: a.provider,
    provider_id: a.identifier ?? null,
    size: a.size,
    region: a.region,
    ubuntu_version: a.ubuntu_version,
    db_status: a.db_status,
    redis_status: a.redis_status,
    php_version: a.php_version,
    php_cli_version: a.php_cli_version,
    opcache_status: a.opcache_status,
    database_type: a.database_type,
    ip_address: a.ip_address,
    ssh_port: a.ssh_port,
    private_ip_address: a.private_ip_address,
    local_public_key: a.local_public_key,
    connection_status: a.connection_status,
    timezone: a.timezone,
    revoked: a.revoked,
    created_at: toForgeTimestamp(a.created_at),
    is_ready: a.is_ready,
    tags: [],
    keywords: [],
  };
};

type SiteCtx = { org_slug: string };

export const normalizeSite = (resource: JsonApiResource<SiteAttributes>, ctx: SiteCtx): ISite => {
  const a = resource.attributes ?? ({} as SiteAttributes);
  const serverId = resource.relationships?.server?.data?.id ?? "";
  return {
    id: resource.id,
    server_id: serverId,
    org_slug: ctx.org_slug,
    name: a.name,
    aliases: a.aliases ?? [],
    directory: a.web_directory,
    wildcards: a.wildcards ?? false,
    status: a.status,
    repository: a.repository?.url ?? undefined,
    repository_provider: a.repository?.provider,
    repository_branch: a.repository?.branch ?? undefined,
    repository_status: a.repository?.status ?? undefined,
    quick_deploy: a.quick_deploy ?? false,
    deployment_status: a.deployment_status ?? null,
    project_type: a.app_type ?? undefined,
    php_version: a.php_version,
    app: null,
    created_at: toForgeTimestamp(a.created_at),
    username: a.user,
    deployment_url: a.deployment_url,
    is_secured: a.https,
    tags: [],
  };
};

type DeploymentCtx = { server_id?: string; site_id?: string };

export const normalizeDeployment = (
  resource: JsonApiResource<DeploymentAttributes>,
  ctx: DeploymentCtx = {}
): IDeployment => {
  const a = resource.attributes ?? ({} as DeploymentAttributes);
  return {
    id: resource.id,
    server_id: ctx.server_id,
    site_id: ctx.site_id,
    type: a.type,
    displayable_type: a.type,
    commit_hash: a.commit?.hash ?? undefined,
    commit_author: a.commit?.author ?? undefined,
    commit_message: a.commit?.message ?? undefined,
    started_at: toForgeTimestamp(a.started_at),
    ended_at: toForgeTimestamp(a.ended_at),
    status: a.status,
  };
};
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `cd laravel-forge && npm test`
Expected: PASS — all normalize tests green.

- [ ] **Step 6: Update the fake data to the new shapes**

Replace the entire contents of `src/lib/faker.ts` with:
```ts
import { faker } from "@faker-js/faker";
import { IServer, ISite } from "../types";

export const createFakeServer = (count = 1): IServer[] => {
  const fakeServer = (): IServer => ({
    id: String(faker.datatype.number()),
    api_token_key: "laravel_forge_api_key",
    ssh_user: faker.internet.userName(),
    org_slug: faker.helpers.arrayElement(["acme", "personal", "clients"]),
    credential_id: faker.datatype.string(),
    name: faker.company.name(),
    type: faker.datatype.string(),
    provider: faker.helpers.arrayElement(["ocean2", "linode", "vultr", "aws", "hetzner", "custom"]),
    provider_id: faker.datatype.string(),
    size: faker.datatype.string(),
    region: faker.datatype.string(),
    ubuntu_version: faker.datatype.string(),
    db_status: faker.datatype.string(),
    redis_status: faker.datatype.string(),
    php_version: faker.datatype.string(),
    php_cli_version: faker.datatype.string(),
    opcache_status: faker.datatype.string(),
    database_type: faker.datatype.string(),
    ip_address: faker.internet.ip(),
    ssh_port: faker.datatype.number(),
    private_ip_address: faker.internet.ip(),
    local_public_key: faker.datatype.string(),
    connection_status: null,
    timezone: "UTC",
    revoked: false,
    created_at: faker.date.past().toISOString(),
    is_ready: true,
    tags: [],
    keywords: faker.helpers.arrayElements([faker.internet.domainName(), faker.internet.domainName()]),
  });
  return Array.from({ length: count }, fakeServer);
};

export const createFakeSite = (serverId: IServer["id"], count = 1): ISite[] => {
  const fakeSite = (): ISite => ({
    id: String(faker.datatype.number()),
    server_id: serverId,
    org_slug: faker.helpers.arrayElement(["acme", "personal", "clients"]),
    name: faker.internet.domainName(),
    aliases: [],
    directory: faker.datatype.string(),
    wildcards: faker.datatype.boolean(),
    status: faker.datatype.string(),
    repository: faker.internet.url(),
    repository_provider: faker.datatype.string(),
    repository_branch: faker.datatype.string(),
    repository_status: faker.datatype.string(),
    quick_deploy: faker.datatype.boolean(),
    deployment_status: faker.helpers.arrayElement(["deploying", "deployed", "failed", null]),
    is_online: faker.datatype.boolean(),
    project_type: faker.datatype.string(),
    php_version: faker.datatype.string(),
    app: null,
    created_at: faker.date.past().toISOString(),
    username: faker.internet.userName(),
    deployment_url: faker.internet.url(),
    is_secured: faker.datatype.boolean(),
    tags: [],
  });
  return Array.from({ length: count }, fakeSite);
};
```

- [ ] **Step 7: Confirm `Mock.ts` still typechecks against the new shapes**

`src/api/Mock.ts` calls `createFakeServer` / `createFakeSite` and needs no change. Verify:
Run: `cd laravel-forge && npm test && npx tsc --noEmit 2>&1 | grep -v "src/api/Site.ts" | grep "error" || echo "no unexpected errors"`
Expected: `no unexpected errors` (the only remaining errors are in `src/api/Site.ts`, from Task 3, fixed in Task 6).

- [ ] **Step 8: Commit**

```bash
cd laravel-forge && git add src/types.ts src/api/normalize.ts src/api/__tests__/normalize.test.ts src/lib/faker.ts && git commit -m "feat: v2 resource types, normalizers, and updated fake data"
```

---

### Task 5: Organizations API and default-org selection state

**Files:**
- Create: `src/api/Org.ts`
- Create: `src/lib/org.ts`

**Interfaces:**
- Consumes: `fetchAllPages`, `authHeaders` (`lib/api`), `FORGE_API_URL` (`config`), `OrgAttributes` (`lib/jsonapi`).
- Produces:
  - `IOrg = { id: string; slug: string; name: string }`
  - `Org.getAll({ token }): Promise<IOrg[]>`
  - `ALL_ORGS` constant, `getPreferredOrg()`, `getStoredDefaultOrg()`, `setStoredDefaultOrg(slug)`, `resolveInitialOrg()`.

- [ ] **Step 1: Create the Org API**

Create `src/api/Org.ts`:
```ts
import { FORGE_API_URL } from "../config";
import { authHeaders, fetchAllPages } from "../lib/api";
import { OrgAttributes } from "../lib/jsonapi";

export interface IOrg {
  id: string;
  slug: string;
  name: string;
}

export const Org = {
  async getAll({ token }: { token: string }): Promise<IOrg[]> {
    if (!token) return [];
    const resources = await fetchAllPages<OrgAttributes>(`${FORGE_API_URL}/orgs`, {
      method: "get",
      headers: authHeaders(token),
    });
    return resources.map((r) => ({ id: r.id, slug: r.attributes.slug, name: r.attributes.name }));
  },
};
```

- [ ] **Step 2: Create the org-selection state helper**

Create `src/lib/org.ts`:
```ts
import { getPreferenceValues, LocalStorage } from "@raycast/api";

const DEFAULT_ORG_KEY = "default-organization";

// Sentinel meaning "do not filter — show servers from every organization".
export const ALL_ORGS = "__all__";

export const getPreferredOrg = (): string | undefined => {
  const pref = getPreferenceValues()?.default_organization as string | undefined;
  return pref?.trim() || undefined;
};

export const getStoredDefaultOrg = async (): Promise<string | undefined> => {
  const value = await LocalStorage.getItem<string>(DEFAULT_ORG_KEY);
  return value || undefined;
};

export const setStoredDefaultOrg = async (slug: string): Promise<void> => {
  await LocalStorage.setItem(DEFAULT_ORG_KEY, slug);
};

// Precedence: in-app saved default → settings preference → all organizations.
export const resolveInitialOrg = async (): Promise<string> => {
  return (await getStoredDefaultOrg()) ?? getPreferredOrg() ?? ALL_ORGS;
};
```

- [ ] **Step 3: Typecheck the new modules**

Run: `cd laravel-forge && npx tsc --noEmit 2>&1 | grep -E "Org.ts|lib/org.ts" || echo "org modules clean"`
Expected: `org modules clean`.

- [ ] **Step 4: Commit**

```bash
cd laravel-forge && git add src/api/Org.ts src/lib/org.ts && git commit -m "feat: organizations API and default-org selection state"
```

---

### Task 6: Rewrite the Server and Site APIs for v2

**Files:**
- Modify (rewrite): `src/api/Server.ts`
- Modify (rewrite): `src/api/Site.ts`

**Interfaces:**
- Consumes: `Org.getAll`, `fetchAllPages`, `apiFetch`, `authHeaders`, normalizers, `FORGE_API_URL`.
- Produces (new signatures later tasks depend on):
  - `Server.getAll(): Promise<IServer[]>` (unchanged signature — enumerates orgs internally)
  - `Server.reboot({ org: string; serverId: string; token: string; key?: string }): Promise<void>`
  - `Site.getSitesWithoutServer({ token: string }): Promise<ISite[]>` (enumerates orgs internally)
  - `Site.getAll({ org: string; serverId: string; token: string }): Promise<ISite[]>`
  - `Site.deploy({ org: string; serverId: string; siteId: string; token: string }): Promise<void>`
  - `Site.getConfig({ org; serverId; siteId; token; type: ConfigFile }): Promise<string>`
  - `Site.getDeploymentHistory({ org; serverId; siteId; token }): Promise<IDeployment[]>`
  - `Site.getDeploymentOutput({ org; serverId; siteId; deploymentId; token }): Promise<string>`

- [ ] **Step 1: Rewrite `api/Site.ts`**

Replace the entire contents of `src/api/Site.ts` with:
```ts
import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { ConfigFile, IDeployment, IServer, ISite } from "../types";
import { apiFetch, authHeaders, fetchAllPages } from "../lib/api";
import {
  ContentAttributes,
  DeploymentAttributes,
  DeploymentOutputAttributes,
  JsonApiSingle,
  SiteAttributes,
} from "../lib/jsonapi";
import { normalizeDeployment, normalizeSite } from "./normalize";
import { Org } from "./Org";

// `WithOrg` (not `Org`) avoids clashing with the imported `Org` API object.
type WithOrg = { org: string };
type ServerWithToken = WithOrg & { serverId: IServer["id"]; token: string };
type ServerSiteWithToken = ServerWithToken & { siteId: ISite["id"] };

const sortSites = (sites: ISite[]): ISite[] => sortBy(sites, "name");

export const Site = {
  // Aggregates every org's sites for the account behind `token`. Used by the
  // menu-bar deploy watcher.
  async getSitesWithoutServer({ token }: { token: string }): Promise<ISite[]> {
    if (!token) return [];
    const orgs = await Org.getAll({ token });
    const perOrg = await Promise.all(orgs.map((org) => Site.getSitesForOrg({ org: org.slug, token })));
    return sortSites(perOrg.flat());
  },

  // Sites for a single org (also used to build server keyword search data).
  async getSitesForOrg({ org, token }: WithOrg & { token: string }): Promise<ISite[]> {
    const resources = await fetchAllPages<SiteAttributes>(`${FORGE_API_URL}/orgs/${org}/sites`, {
      method: "get",
      headers: authHeaders(token),
    });
    return sortSites(resources.map((r) => normalizeSite(r, { org_slug: org })));
  },

  async getAll({ org, serverId, token }: ServerWithToken): Promise<ISite[]> {
    const resources = await fetchAllPages<SiteAttributes>(
      `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites`,
      { method: "get", headers: authHeaders(token) }
    );
    return sortSites(resources.map((r) => normalizeSite(r, { org_slug: org })));
  },

  async deploy({ org, serverId, siteId, token }: ServerSiteWithToken): Promise<void> {
    await apiFetch(`${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites/${siteId}/deployments`, {
      method: "post",
      headers: authHeaders(token),
    });
  },

  async getConfig({ org, serverId, siteId, token, type }: ServerSiteWithToken & { type: ConfigFile }): Promise<string> {
    const path = type === "env" ? "environment" : "nginx";
    const response = await apiFetch<JsonApiSingle<ContentAttributes>>(
      `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites/${siteId}/${path}`,
      { method: "get", headers: authHeaders(token) }
    );
    return (response?.data?.attributes?.content ?? "").trim();
  },

  async getDeploymentHistory({ org, serverId, siteId, token }: ServerSiteWithToken): Promise<IDeployment[]> {
    const resources = await fetchAllPages<DeploymentAttributes>(
      `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites/${siteId}/deployments`,
      { method: "get", headers: authHeaders(token) }
    );
    return resources.map((r) => normalizeDeployment(r, { server_id: serverId, site_id: siteId }));
  },

  async getDeploymentOutput({
    org,
    serverId,
    siteId,
    deploymentId,
    token,
  }: ServerSiteWithToken & { deploymentId: IDeployment["id"] }): Promise<string> {
    const response = await apiFetch<JsonApiSingle<DeploymentOutputAttributes>>(
      `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/sites/${siteId}/deployments/${deploymentId}/log`,
      { method: "get", headers: authHeaders(token) }
    );
    return response?.data?.attributes?.output ?? "";
  },
};
```

- [ ] **Step 2: Rewrite `api/Server.ts`**

Replace the entire contents of `src/api/Server.ts` with:
```ts
import { getPreferenceValues } from "@raycast/api";
import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { IServer, ISite } from "../types";
import { apiFetch, authHeaders, fetchAllPages } from "../lib/api";
import { ServerAttributes } from "../lib/jsonapi";
import { normalizeServer } from "./normalize";
import { Org } from "./Org";
import { Site } from "./Site";

type Account = { tokenKey: string; token: string; sshUser: string };

type DynamicReboot = {
  org: string;
  serverId: IServer["id"];
  token: string;
  key?: string;
};

export const Server = {
  async getAll(): Promise<IServer[]> {
    const preferences = getPreferenceValues();
    const accounts: Account[] = [
      {
        tokenKey: "laravel_forge_api_key",
        token: preferences?.laravel_forge_api_key as string,
        sshUser: (preferences?.laravel_forge_ssh_user as string) || "forge",
      },
    ];
    if (preferences?.laravel_forge_api_key_two) {
      accounts.push({
        tokenKey: "laravel_forge_api_key_two",
        token: preferences?.laravel_forge_api_key_two as string,
        sshUser: (preferences?.laravel_forge_ssh_user_two as string) || "forge",
      });
    }

    const servers = (await Promise.all(accounts.map(getServersForAccount))).flat();
    return sortBy(servers, (s) => s?.name?.toLowerCase());
  },

  async reboot({ org, serverId, token, key = "" }: DynamicReboot): Promise<void> {
    const endpoint = key
      ? `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/services/${key}/actions`
      : `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/actions`;
    await apiFetch(endpoint, {
      method: "post",
      headers: authHeaders(token),
      body: JSON.stringify({ action: "reboot" }),
    });
  },
};

const getServersForAccount = async ({ token, tokenKey, sshUser }: Account): Promise<IServer[]> => {
  if (!token) return [];
  const orgs = await Org.getAll({ token });

  const perOrg = await Promise.all(
    orgs.map(async (org) => {
      const resources = await fetchAllPages<ServerAttributes>(`${FORGE_API_URL}/orgs/${org.slug}/servers`, {
        method: "get",
        headers: authHeaders(token),
      });

      // Build keyword search data from this org's sites (fail gracefully — non-critical).
      let keywordsByServer: Record<string, Set<string>> = {};
      try {
        const sites = await Site.getSitesForOrg({ org: org.slug, token });
        keywordsByServer = getSiteKeywords(sites);
      } catch (error) {
        console.error(error);
      }

      return resources
        .map((r) => normalizeServer(r, { org_slug: org.slug, api_token_key: tokenKey, ssh_user: sshUser }))
        .map((server) => {
          server.keywords = keywordsByServer[server.id] ? [...keywordsByServer[server.id]] : [];
          return server;
        })
        .filter((s) => !s.revoked);
    })
  );

  return perOrg.flat();
};

const getSiteKeywords = (sites: ISite[]): Record<string, Set<string>> => {
  return sites.reduce((acc, site) => {
    if (!site?.server_id) return acc;
    const keywords = [site?.name ?? "", ...(site?.aliases ?? [])];
    if (!acc[site.server_id]) acc[site.server_id] = new Set<string>();
    keywords.forEach((keyword) => keyword && acc[site.server_id].add(keyword));
    return acc;
  }, {} as Record<string, Set<string>>);
};
```

- [ ] **Step 3: Full-tree typecheck (gate re-established)**

Run: `cd laravel-forge && npx tsc --noEmit`
Expected: errors ONLY in the callers that still use old signatures — `src/hooks/useSites.ts`, `src/hooks/useAllSites.ts`, `src/hooks/useConfig.ts`, `src/hooks/useDeployments.ts`, `src/hooks/useDeploymentOutput.ts`, `src/components/actions/ServerCommands.tsx`, `src/components/actions/SiteCommands.tsx`, `src/components/servers/ServerSingle.tsx`, `src/components/sites/SiteSingle.tsx`, and `src/check-deploy-status.tsx`. These are fixed in Tasks 7–9. No errors in `api/`, `lib/`.

- [ ] **Step 4: Run unit tests (still green)**

Run: `cd laravel-forge && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd laravel-forge && git add src/api/Server.ts src/api/Site.ts && git commit -m "feat: rewrite Server and Site APIs for v2 (org-scoped)"
```

---

### Task 7: Thread the org through hooks and config components

**Files:**
- Modify: `src/hooks/useSites.ts`
- Modify: `src/hooks/useAllSites.ts`
- Modify: `src/hooks/useConfig.ts`
- Modify: `src/hooks/useDeployments.ts`
- Modify: `src/hooks/useDeploymentOutput.ts`

**Interfaces:**
- Consumes: the Task 6 `Site.*` signatures (all now take `org`).
- Produces: hooks unchanged in their public return shape; SWR keys now include `org_slug`.

- [ ] **Step 1: Update `useSites.ts`**

Replace the fetcher and key in `src/hooks/useSites.ts` so the org is threaded. New file contents:
```ts
import useSWR from "swr";
import type { SWRConfiguration } from "swr";
import { IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";
import { LocalStorage } from "@raycast/api";
import { USE_FAKE_DATA } from "../config";
import { MockSite } from "../api/Mock";

type key = [IServer["id"], IServer["org_slug"], IServer["api_token_key"]];

const fetcher = async ([serverId, org, tokenKey]: key) => {
  if (USE_FAKE_DATA) return MockSite.getAll(serverId);
  const cacheKey = `sites-${serverId}`;
  Site.getAll({ org, serverId, token: unwrapToken(tokenKey) })
    .then((data) => LocalStorage.setItem(cacheKey, JSON.stringify(data)))
    .catch(() => LocalStorage.removeItem(cacheKey));

  return await backupData(cacheKey);
};

export const useSites = (server?: IServer, optons: Partial<SWRConfiguration> = {}) => {
  const { data, error } = useSWR<ISite[]>(
    server?.id ? [server.id, server.org_slug, server.api_token_key] : null,
    fetcher,
    optons
  );

  return {
    sites: data,
    loading: !error && !data,
    error: error,
  };
};

const backupData = async (cacheKey: string) => {
  const data = await LocalStorage.getItem(cacheKey);
  if (typeof data === "string") return JSON.parse(data);
  return data;
};
```

- [ ] **Step 2: Update `useAllSites.ts`**

`Site.getSitesWithoutServer` still takes only `{ token }` (it enumerates orgs internally), so only confirm it compiles. No functional change needed, but verify the file matches:
```ts
import useSWR from "swr";
import { ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetcher = ([_, tokenKey]: [unknown, string]) =>
  Site.getSitesWithoutServer({ token: unwrapToken(tokenKey) });

export const useAllSites = (tokenKey: string) => {
  const { data, error } = useSWR<ISite[]>(["all-sites", tokenKey], fetcher, {
    refreshInterval: 60_000 * 5,
  });

  return {
    sites: data,
    loading: !error && !data,
    error: error,
  };
};
```

- [ ] **Step 3: Update `useConfig.ts`**

Replace `src/hooks/useConfig.ts` with:
```ts
import useSWR from "swr";
import { ConfigFile, IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

type key = [IServer["id"], ISite["id"], ConfigFile, IServer["org_slug"], IServer["api_token_key"]];

const fetcher = async ([serverId, siteId, type, org, tokenKey]: key) =>
  await Site.getConfig({ type, siteId, serverId, org, token: unwrapToken(tokenKey) });

type IncomingProps = { server?: IServer; site?: ISite; type: ConfigFile };
export const useConfig = ({ server, site, type }: IncomingProps) => {
  const { data, error } = useSWR<string>(
    server?.id && site?.id ? [server.id, site.id, type, server.org_slug, server.api_token_key] : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  return {
    fileString: data,
    loading: !error && !data,
    error: error,
  };
};
```

- [ ] **Step 4: Update `useDeployments.ts`**

Replace `src/hooks/useDeployments.ts` with:
```ts
import useSWR from "swr";
import { IDeployment, IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

type key = [IServer["id"], ISite["id"], IServer["org_slug"], IServer["api_token_key"]];

const fetcher = async ([serverId, siteId, org, tokenKey]: key) =>
  await Site.getDeploymentHistory({ siteId, serverId, org, token: unwrapToken(tokenKey) });

type IncomingProps = { server?: IServer; site?: ISite };
export const useDeployments = ({ server, site }: IncomingProps) => {
  const { data, error } = useSWR<IDeployment[]>(
    server?.id && site?.id ? [server.id, site.id, server.org_slug, server.api_token_key] : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  return {
    deployments: data,
    loading: !error && !data,
    error: error,
  };
};
```

- [ ] **Step 5: Update `useDeploymentOutput.ts`**

Replace `src/hooks/useDeploymentOutput.ts` with:
```ts
import useSWR from "swr";
import { IDeployment, IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

type key = [IServer["id"], ISite["id"], IDeployment["id"], IServer["org_slug"], IServer["api_token_key"]];

const fetcher = async ([serverId, siteId, deploymentId, org, tokenKey]: key) =>
  await Site.getDeploymentOutput({ siteId, serverId, deploymentId, org, token: unwrapToken(tokenKey) });

type IncomingProps = {
  server: IServer;
  site: ISite;
  deployment: IDeployment;
};

export const useDeploymentOutput = ({ server, site, deployment }: IncomingProps) => {
  const { data, error } = useSWR<string>(
    server?.id ? [server.id, site.id, deployment.id, server.org_slug, server.api_token_key] : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  return {
    output: data,
    loading: !error && !data,
    error: error,
  };
};
```

- [ ] **Step 6: Typecheck**

Run: `cd laravel-forge && npx tsc --noEmit`
Expected: remaining errors ONLY in `ServerCommands.tsx`, `SiteCommands.tsx`, `ServerSingle.tsx`, `SiteSingle.tsx`, `check-deploy-status.tsx` (Tasks 8–9).

- [ ] **Step 7: Commit**

```bash
cd laravel-forge && git add src/hooks && git commit -m "feat: thread organization slug through data hooks"
```

---

### Task 8: Org dropdown UI and org-aware server/site commands

**Files:**
- Modify: `src/components/actions/ServerCommands.tsx`
- Modify: `src/components/actions/SiteCommands.tsx`
- Modify: `src/components/servers/ServerSingle.tsx`
- Modify: `src/components/sites/SiteSingle.tsx`
- Modify: `src/components/servers/ServersList.tsx`

**Interfaces:**
- Consumes: `Server.reboot({ org, serverId, token, key? })`, `Site.deploy({ org, serverId, siteId, token })`, `resolveInitialOrg`, `setStoredDefaultOrg`, `ALL_ORGS` (`lib/org`).
- Produces: an org `List.Dropdown` in the Manage Servers command; a "Set as Default Organization" action.

- [ ] **Step 1: Make `Server.reboot` calls org-aware in `ServerCommands.tsx`**

In `src/components/actions/ServerCommands.tsx`, change the reboot call (lines 22-25) from:
```tsx
          Server.reboot({ serverId: server.id, token }).catch(() => {
```
to:
```tsx
          Server.reboot({ org: server.org_slug, serverId: server.id, token }).catch(() => {
```

- [ ] **Step 2: Make `Server.reboot` calls org-aware in `ServerSingle.tsx`**

In `src/components/servers/ServerSingle.tsx`, update BOTH reboot calls:
- Line 86: `await Server.reboot({ serverId: server.id, token }).catch(() => {` → `await Server.reboot({ org: server.org_slug, serverId: server.id, token }).catch(() => {`
- Line 109: `await Server.reboot({ serverId: server.id, token, key }).catch(() => {` → `await Server.reboot({ org: server.org_slug, serverId: server.id, token, key }).catch(() => {`

- [ ] **Step 3: Make `Site.deploy` calls org-aware in `SiteCommands.tsx`**

In `src/components/actions/SiteCommands.tsx`, change the deploy call (lines 24-26) from:
```tsx
            Site.deploy({ siteId: site.id, serverId: server.id, token }).catch(() =>
```
to:
```tsx
            Site.deploy({ org: server.org_slug, siteId: site.id, serverId: server.id, token }).catch(() =>
```

- [ ] **Step 4: Make `Site.deploy` calls org-aware in `SiteSingle.tsx`**

In `src/components/sites/SiteSingle.tsx`, change the deploy call (line 199) from:
```tsx
              Site.deploy({ siteId: siteData.id, serverId: server.id, token }).catch(() =>
```
to:
```tsx
              Site.deploy({ org: server.org_slug, siteId: siteData.id, serverId: server.id, token }).catch(() =>
```

- [ ] **Step 5: Add the org dropdown + default filtering to `ServersList.tsx`**

Replace the entire contents of `src/components/servers/ServersList.tsx` with:
```tsx
import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useServers } from "../../hooks/useServers";
import { IServer } from "../../types";
import { EmptyView } from "../../components/EmptyView";
import { ServerSingle } from "./ServerSingle";
import { ServerCommands } from "../actions/ServerCommands";
import { getServerColor } from "../../lib/color";
import { useSites } from "../../hooks/useSites";
import { useEffect, useMemo, useState } from "react";
import { ALL_ORGS, resolveInitialOrg, setStoredDefaultOrg } from "../../lib/org";

export const ServersList = ({ search }: { search: string }) => {
  const [preLoadedServer, setPreLoadedServer] = useState<IServer>();
  const { servers, loading, error } = useServers();
  const [incomingSearch, setIncomingSearch] = useState(search);
  const [selectedOrg, setSelectedOrg] = useState<string>(ALL_ORGS);
  useSites(preLoadedServer, {
    // Immutable
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const { push } = useNavigation();

  useEffect(() => {
    resolveInitialOrg().then(setSelectedOrg);
  }, []);

  // Unique org slugs present in the fetched servers, for the dropdown.
  const orgs = useMemo(() => {
    const set = new Set<string>();
    servers?.forEach((s) => s.org_slug && set.add(s.org_slug));
    return [...set].sort();
  }, [servers]);

  const visibleServers = useMemo(() => {
    if (selectedOrg === ALL_ORGS) return servers ?? [];
    return (servers ?? []).filter((s) => s.org_slug === selectedOrg);
  }, [servers, selectedOrg]);

  useEffect(() => {
    if (!incomingSearch) return;
    const server =
      // First match by ID, then if not do a full search
      servers?.find((server) => server.id.toString() === incomingSearch) ||
      servers?.find((server) => JSON.stringify(server).includes(incomingSearch));
    if (!server) return;
    showToast(Toast.Style.Success, `Now showing: ${server?.name}` ?? `Now showing: #${server?.id}`);
    push(<ServerSingle server={server} />);
    setIncomingSearch("");
  }, [incomingSearch]);

  const preFetchSites = (serverId: string | null) => {
    const server = servers?.find((server) => server.id.toString() === serverId);
    setPreLoadedServer(server);
  };

  const saveDefaultOrg = async () => {
    await setStoredDefaultOrg(selectedOrg);
    await showToast(
      Toast.Style.Success,
      selectedOrg === ALL_ORGS ? "Default set to: All organizations" : `Default organization: ${selectedOrg}`
    );
  };

  if (error?.message) {
    return <EmptyView title={`Error: ${error.message}`} />;
  }
  if (servers?.length === 0 && !loading) {
    return <EmptyView title="No servers found" />;
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search servers..."
      onSelectionChange={preFetchSites}
      searchBarAccessory={
        <List.Dropdown tooltip="Organization" value={selectedOrg} onChange={setSelectedOrg}>
          <List.Dropdown.Item title="All organizations" value={ALL_ORGS} />
          {orgs.map((org) => (
            <List.Dropdown.Item key={org} title={org} value={org} />
          ))}
        </List.Dropdown>
      }
    >
      {visibleServers.map((server: IServer) => {
        return <ServerListItem key={server.id} server={server} onSetDefaultOrg={saveDefaultOrg} />;
      })}
    </List>
  );
};

const ServerListItem = ({ server, onSetDefaultOrg }: { server: IServer; onSetDefaultOrg: () => void }) => {
  if (!server?.id) return null;
  return (
    <List.Item
      id={server.id.toString()}
      key={server.id}
      keywords={server.keywords}
      accessories={[{ text: server?.keywords?.join(", ") ?? "" }]}
      title={server?.name ?? "Server name undefined"}
      icon={{
        source: Icon.Box,
        tintColor: getServerColor(server?.provider ?? ""),
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Server Information"
              icon={Icon.Binoculars}
              target={<ServerSingle server={server} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Organization">
            <Action icon={Icon.Star} title="Set Selected Org as Default" onAction={onSetDefaultOrg} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Commands">
            <ServerCommands server={server} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
```

- [ ] **Step 6: Typecheck and lint**

Run: `cd laravel-forge && npx tsc --noEmit && npm run lint`
Expected: remaining errors ONLY in `src/check-deploy-status.tsx` (Task 9). Lint may autofixable-warn; run `npm run fix-lint` if needed.

- [ ] **Step 7: Manual smoke test**

Run: `cd laravel-forge && npm run dev`
Verify in Raycast → "Manage Servers": servers load; the org dropdown lists your orgs + "All organizations"; switching filters the list; "Set Selected Org as Default" shows a success toast; opening a server, viewing .env and nginx, viewing deploy history + output, triggering a deploy, and rebooting a service all work. Stop dev mode when done.

- [ ] **Step 8: Commit**

```bash
cd laravel-forge && git add src/components && git commit -m "feat: organization dropdown, default org action, and org-aware commands"
```

---

### Task 9: Update the menu-bar deploy watcher

**Files:**
- Modify: `src/check-deploy-status.tsx`

**Interfaces:**
- Consumes: `useAllSites` (unchanged), string ids on `ISite`.
- Produces: menu-bar watcher compiles and runs against v2 data.

- [ ] **Step 1: Change `RecentEntry.id` to string and fix comparisons**

In `src/check-deploy-status.tsx`:
- Line 18: `id: number;` → `id: string;`
- Line 41: change the filter type annotation `(entry: { id: number; timestamp: number })` → `(entry: { id: string; timestamp: number })`.
- Line 48: `(entry: { id: number })` → `(entry: { id: string })`.

These match the now-string `site.id`. The rest of the file (equality checks, `String(site.server_id)`) already works with strings.

- [ ] **Step 2: Typecheck (full tree now clean)**

Run: `cd laravel-forge && npx tsc --noEmit`
Expected: NO errors anywhere.

- [ ] **Step 3: Lint and build**

Run: `cd laravel-forge && npm run lint && npm run build`
Expected: lint clean; build succeeds (`ray build -e dist`).

- [ ] **Step 4: Run unit tests**

Run: `cd laravel-forge && npm test`
Expected: PASS.

- [ ] **Step 5: Manual smoke test of the menu bar**

Run: `cd laravel-forge && npm run dev`. Trigger a deploy on a site (from the Manage Servers command or the Forge dashboard) and confirm the "Forge Deployments" menu-bar item shows the deploy under "Current Activity" and then "Recent Activity", and that a macOS notification appears. Stop dev mode when done.

- [ ] **Step 6: Commit**

```bash
cd laravel-forge && git add src/check-deploy-status.tsx && git commit -m "feat: update menu-bar deploy watcher for v2 (string ids)"
```

---

### Task 10: Documentation and final cleanup

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Verify: no remaining v1 references or dead code across `src/`

**Interfaces:** none (docs + verification).

- [ ] **Step 1: Remove the now-unused `apiFetchText` helper**

`apiFetchText` was kept through Tasks 3–9 while `Site.ts` still referenced it; after the Task 6 rewrite nothing uses it. Delete the `apiFetchText` export from `src/lib/api.ts` (the `export const apiFetchText = async <T>...` block).

- [ ] **Step 2: Confirm no v1 references remain**

Run:
```bash
cd laravel-forge && grep -rn "api/v1\|deployment-history\|apiFetchText\|/reboot\|deployment/deploy" src/ || echo "clean"
```
Expected: `clean`. If anything prints, remove/fix it (these are all v1 artifacts). Then run `cd laravel-forge && npx tsc --noEmit` and confirm no errors.

- [ ] **Step 2: Update the README**

In `README.md`, ensure setup instructions state that a **v2 API token** is required (generated from the Forge profile page) and mention the optional default-organization preference and the in-app org dropdown. Add a short "Organizations" paragraph describing that you can filter by org and set a default.

- [ ] **Step 4: Add a CHANGELOG entry**

In `CHANGELOG.md`, add a new top entry dated today describing: migrated to Laravel Forge API v2; added organization filtering with a settable default; requires a v2 API token.

- [ ] **Step 5: Final full verification**

Run: `cd laravel-forge && npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all four succeed with no errors.

- [ ] **Step 6: Commit**

```bash
cd laravel-forge && git add src/lib/api.ts README.md CHANGELOG.md && git commit -m "docs: document API v2 migration and organization support; drop apiFetchText"
```

---

## Notes on trade-offs (for the implementer)

- **All orgs are fetched up front.** `Server.getAll()` enumerates every org for each account and fetches their servers, then the UI filters client-side by the dropdown. This means switching org is instant (no refetch) at the cost of more requests on load for accounts with many orgs. If this proves slow, a later change can scope the fetch to the selected org.
- **Service restart uses `action: "reboot"`.** The v2 service-action enums (mysql/nginx/php/postgres) all accept `reboot`. If a specific service rejects it, adjust the action value for that service.
- **Timestamps** are reformatted in the normalizer so the existing `new Date(x + " UTC")` component code keeps working; do not remove `toForgeTimestamp` without also changing those components.
