import { beforeEach, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { installFetch, orgPage, page, rejects, serverRow } from "../helpers/forge-mock";
import { knownOrgs, rememberOrgs } from "../../src/lib/index-cache";
import listServers from "../../src/tools/list-servers";

const T1 = "laravel_forge_api_token";

beforeEach(() => {
  __resetStorage();
  __setPreferences({ [T1]: "tok-1" });
  vi.unstubAllGlobals();
});

// A slug the token lost would otherwise wedge every list tool
it("drops a cached org list the moment Forge rejects one of its slugs", async () => {
  await rememberOrgs(T1, ["acme-inc", "deleted-co"]);
  installFetch([
    (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc") : undefined),
    (u) => (u.pathname === "/api/orgs/acme-inc/servers" ? page([serverRow(9001)]) : undefined),
    (u) => (u.pathname === "/api/orgs/deleted-co/servers" ? rejects(403) : undefined),
  ]);

  const out = await listServers({});
  expect(out.servers.map((server) => server.id)).toEqual([9001]);
  expect(await knownOrgs(T1)).toBeUndefined();
});

it("still fails loudly when no cached org is reachable", async () => {
  await rememberOrgs(T1, ["deleted-co"]);
  installFetch([
    (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc") : undefined),
    (u) => (u.pathname === "/api/orgs/deleted-co/servers" ? rejects(403) : undefined),
  ]);

  await expect(listServers({})).rejects.toThrow(/rejected every organization/);
  expect(await knownOrgs(T1)).toBeUndefined();
});
