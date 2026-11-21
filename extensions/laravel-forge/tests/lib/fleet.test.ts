import { beforeEach, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { installFetch, orgPage, page, siteRow } from "../helpers/forge-mock";
import { fleetSites } from "../../src/lib/fleet";
import { locateSite } from "../../src/lib/coordinates";

const T1 = "laravel_forge_api_token";

beforeEach(() => {
  __resetStorage();
  __setPreferences({ [T1]: "tok-1" });
  vi.unstubAllGlobals();
});

// The menu bar reads every site on a schedule; a tool call after a tick should
// not have to list them again
it("banks a coordinate for every site the menu bar loads", async () => {
  installFetch([
    (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc", "side-project") : undefined),
    (u) => (u.pathname === "/api/orgs/acme-inc/sites" ? page([siteRow(5001, 9001)]) : undefined),
    (u) => (u.pathname === "/api/orgs/side-project/sites" ? page([siteRow(5002, 9002)]) : undefined),
  ]);

  const sites = await fleetSites(T1);
  expect(sites.map((site) => site.id).sort()).toEqual([5001, 5002]);
  expect(sites.map((site) => site.server_id).sort()).toEqual([9001, 9002]);

  await expect(locateSite(5001)).resolves.toMatchObject({ org: "acme-inc", serverId: 9001 });
  await expect(locateSite(5002)).resolves.toMatchObject({ org: "side-project", serverId: 9002 });
});

it("is empty rather than throwing when the token is not configured", async () => {
  installFetch([]);
  expect(await fleetSites("laravel_forge_api_token_two")).toEqual([]);
});
