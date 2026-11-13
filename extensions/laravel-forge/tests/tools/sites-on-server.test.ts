import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { installFetch, orgPage, page, serverRow, siteRow } from "../helpers/forge-mock";
import { locateSite } from "../../src/lib/coordinates";
import { remember } from "../../src/lib/index-cache";
import getServer from "../../src/tools/get-server";
import { confirmation } from "../../src/tools/reboot-server";

const T1 = "laravel_forge_api_token";

// 200 sites: Forge hands back 30 at a time behind a cursor
const HOSTED = 200;
const pageOf = (cursor: string | null) => {
  const start = cursor ? Number(cursor) : 0;
  const rows = Array.from({ length: Math.min(30, HOSTED - start) }, (_, i) => siteRow(5001 + start + i, 9001));
  const next = start + rows.length;
  return page(rows, next < HOSTED ? String(next) : null);
};

beforeEach(async () => {
  __resetStorage();
  __setPreferences({ [T1]: "tok-1" });
  vi.unstubAllGlobals();
  installFetch([
    (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc") : undefined),
    (u) => (u.pathname === "/api/orgs/acme-inc/servers/9001" ? { data: serverRow(9001) } : undefined),
    (u) =>
      u.pathname === "/api/orgs/acme-inc/servers/9001/sites" ? pageOf(u.searchParams.get("page[cursor]")) : undefined,
  ]);
  await remember("server", 9001, { tokenKey: T1, org: "acme-inc" });
});

describe("a server's site list", () => {
  it("counts every site, not just Forge's first page", async () => {
    const out = await getServer({ serverId: 9001 });
    expect(out.sites).toHaveLength(HOSTED);
    expect(out.note).toContain(`${HOSTED} sites on this server`);
  });

  it("caches the coordinates of every id it hands the model", async () => {
    const out = await getServer({ serverId: 9001 });
    // get-server tells the model to pass these to any site tool, so they must resolve
    await expect(locateSite(out.sites[0].id)).resolves.toMatchObject({ org: "acme-inc", serverId: 9001 });
    await expect(locateSite(out.sites.at(-1)!.id)).resolves.toMatchObject({ serverId: 9001 });
  });

  it("tells a reboot confirmation the real blast radius", async () => {
    const dialog = await confirmation({ serverId: 9001 });
    const line = dialog!.info!.find((entry) => entry.name.startsWith("Sites going down"))!;
    expect(line.name).toBe(`Sites going down (${HOSTED})`);
  });
});
