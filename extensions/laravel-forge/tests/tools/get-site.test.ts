import { beforeEach, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { installFetch, orgPage, page, serverRow, siteRow } from "../helpers/forge-mock";
import listSites from "../../src/tools/list-sites";
import getSite from "../../src/tools/get-site";

const T1 = "laravel_forge_api_token";

beforeEach(() => {
  __resetStorage();
  __setPreferences({ [T1]: "tok-1" });
  vi.unstubAllGlobals();
  installFetch([
    (u) => (u.pathname === "/api/orgs" ? orgPage("kevin-batdorf") : undefined),
    (u) => (u.pathname === "/api/orgs/kevin-batdorf/sites" ? page([siteRow(2330132, 782891)]) : undefined),
    (u) => (u.pathname === "/api/orgs/kevin-batdorf/sites/2330132" ? { data: siteRow(2330132, 782891) } : undefined),
    (u) => (u.pathname === "/api/orgs/kevin-batdorf/servers/782891" ? { data: serverRow(782891) } : undefined),
    (u) => (u.pathname.endsWith("/deployments") ? page([]) : undefined),
  ]);
});

it("works on a site found by name, without a list-servers call first", async () => {
  const listed = await listSites({ name: "partners-testing" });
  expect(listed.sites.map((site) => site.id)).toEqual([2330132]);

  const out = await getSite({ siteId: 2330132 });
  expect(out.id).toBe(2330132);
  expect(out.server).toEqual({ id: 782891, name: "web-782891" });
});

it("answers null for a field Forge left out rather than dropping the key", async () => {
  vi.unstubAllGlobals();
  installFetch([
    (u) => (u.pathname === "/api/orgs" ? orgPage("kevin-batdorf") : undefined),
    (u) =>
      u.pathname === "/api/orgs/kevin-batdorf/sites/2330132"
        ? { data: { id: "2330132", type: "sites", attributes: { name: "bare.com" } } }
        : undefined,
    (u) => (u.pathname === "/api/orgs/kevin-batdorf/servers/782891" ? { data: serverRow(782891) } : undefined),
    (u) => (u.pathname.endsWith("/deployments") ? page([]) : undefined),
  ]);
  const { remember } = await import("../../src/lib/index-cache");
  await remember("site", 2330132, { tokenKey: T1, org: "kevin-batdorf", serverId: 782891 });
  await remember("server", 782891, { tokenKey: T1, org: "kevin-batdorf" });

  const out = JSON.parse(JSON.stringify(await getSite({ siteId: 2330132 })));
  expect(out).toHaveProperty("healthcheckUrl", null);
  expect(out).toHaveProperty("phpVersion", null);
  expect(out).toHaveProperty("maintenanceMode", null);
});
