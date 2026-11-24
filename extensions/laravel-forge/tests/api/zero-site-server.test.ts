import { beforeEach, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { calls, installFetch, page, serverRow } from "../helpers/forge-mock";
import { Site } from "../../src/api/Site";

beforeEach(() => {
  __resetStorage();
  __setPreferences({ laravel_forge_api_token: "tok-1" });
  vi.unstubAllGlobals();
});

it("asks the server directly when it hosts nothing", async () => {
  installFetch([
    (u) => (u.pathname === "/api/orgs/kevin-batdorf/servers/849534/sites" ? page([]) : undefined),
    (u) =>
      u.pathname === "/api/orgs/kevin-batdorf/servers/849534"
        ? { data: serverRow(849534, { revoked: true }) }
        : undefined,
  ]);

  const out = await Site.getAll({ orgSlug: "kevin-batdorf", serverId: 849534, token: "tok-1" });
  expect(out.sites).toEqual([]);
  expect(out.archived).toBe(true);
  expect(calls.some((c) => c.endsWith("/servers/849534"))).toBe(true);
});

it("costs nothing extra when the server has sites", async () => {
  installFetch([
    (u) =>
      u.pathname === "/api/orgs/kevin-batdorf/servers/678350/sites"
        ? { data: [{ id: "1", type: "sites", attributes: { name: "a.com" } }], included: [serverRow(678350)] }
        : undefined,
  ]);

  const out = await Site.getAll({ orgSlug: "kevin-batdorf", serverId: 678350, token: "tok-1" });
  expect(out.archived).toBe(false);
  expect(calls.filter((c) => c.includes("/servers/678350")).length).toBe(1);
});
