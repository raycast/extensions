import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { installFetch, orgPage, serverRow } from "../helpers/forge-mock";
import { lookup, remember } from "../../src/lib/index-cache";
import deploymentHistory from "../../src/tools/deployment-history";
import deploymentLog from "../../src/tools/deployment-log";
import siteConfig from "../../src/tools/site-config";
import serverEvents from "../../src/tools/server-events";
import getSite from "../../src/tools/get-site";

const T1 = "laravel_forge_api_token";

beforeEach(async () => {
  __resetStorage();
  __setPreferences({ [T1]: "tok-1" });
  vi.unstubAllGlobals();
  installFetch([
    (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc") : undefined),
    // The server itself still resolves, so only the read behind it can evict
    (u) => (u.pathname === "/api/orgs/acme-inc/servers/9001" ? { data: serverRow(9001) } : undefined),
  ]);
  await remember("site", 5001, { tokenKey: T1, org: "acme-inc", serverId: 9001 });
  await remember("server", 9001, { tokenKey: T1, org: "acme-inc" });
});

// Covers every tool reading behind a located id, not just the two using records.ts
describe("a deleted resource", () => {
  const cases = [
    ["deployment-history", () => deploymentHistory({ siteId: 5001 }), "site", 5001],
    ["deployment-log", () => deploymentLog({ siteId: 5001 }), "site", 5001],
    ["site-config", () => siteConfig({ siteId: 5001, type: "nginx" as const }), "site", 5001],
    ["get-site", () => getSite({ siteId: 5001 }), "site", 5001],
    ["server-events", () => serverEvents({ serverId: 9001 }), "server", 9001],
  ] as const;

  for (const [name, run, kind, id] of cases) {
    it(`${name} names the next call and drops the coordinate`, async () => {
      await expect(run()).rejects.toThrow(`Forge no longer has ${kind} ${id}. Call list-${kind}s now`);
      expect(await lookup(kind, id)).toBeUndefined();
    });
  }
});
