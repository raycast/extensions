import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { calls, installFetch, orgPage, page, siteRow } from "../helpers/forge-mock";
import listSites from "../../src/tools/list-sites";
import { locateSite } from "../../src/lib/coordinates";

const T1 = "laravel_forge_api_token";

// A site row carries relationships only when the request includes them, and
// without the server there is no path to the site
const bare = (id: number) => ({
  id: String(id),
  type: "site",
  attributes: { name: `site-${id}.com`, status: "installed" },
});

beforeEach(() => {
  __resetStorage();
  __setPreferences({ [T1]: "tok-1" });
  vi.unstubAllGlobals();
});

describe("list-sites", () => {
  it("asks Forge for the server relationship", async () => {
    installFetch([
      (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc") : undefined),
      (u) => (u.pathname === "/api/orgs/acme-inc/sites" ? page([siteRow(2882133, 678350)]) : undefined),
    ]);

    await listSites({});
    expect(calls.find((c) => c.startsWith("/api/orgs/acme-inc/sites"))).toContain("include=server");
  });

  it("caches an id it hands back, so a site tool can act on it", async () => {
    installFetch([
      (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc") : undefined),
      (u) => (u.pathname === "/api/orgs/acme-inc/sites" ? page([siteRow(2882133, 678350)]) : undefined),
    ]);

    const out = await listSites({ name: "6-8" });
    expect(out.sites.map((site) => site.id)).toEqual([2882133]);
    await expect(locateSite(2882133)).resolves.toMatchObject({ org: "acme-inc", serverId: 678350 });
  });

  it("says so when a row names no server instead of handing over a dead id", async () => {
    installFetch([
      (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc") : undefined),
      (u) => (u.pathname === "/api/orgs/acme-inc/sites" ? page([bare(2882133)]) : undefined),
    ]);

    const out = await listSites({});
    expect(out.note).toContain("name no server");
    await expect(locateSite(2882133)).rejects.toThrow(/no coordinates/);
  });

  it("does not ask for the server when the path already names one", async () => {
    installFetch([
      (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc") : undefined),
      (u) => (u.pathname === "/api/orgs/acme-inc/servers/678350/sites" ? page([bare(2882133)]) : undefined),
    ]);
    const { remember } = await import("../../src/lib/index-cache");
    await remember("server", 678350, { tokenKey: T1, org: "acme-inc" });

    await listSites({ serverId: 678350 });
    const call = calls.find((c) => c.includes("/servers/678350/sites"))!;
    expect(call).not.toContain("include=server");
    await expect(locateSite(2882133)).resolves.toMatchObject({ serverId: 678350 });
  });
});
