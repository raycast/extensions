import { beforeEach, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { installFetch, orgPage, page, siteRow } from "../helpers/forge-mock";
import deploymentStatus from "../../src/tools/deployment-status";

beforeEach(() => {
  __resetStorage();
  __setPreferences({ laravel_forge_api_token: "tok-1" });
  vi.unstubAllGlobals();
});

it("finds a deploy that sits past Forge's first page", async () => {
  const first = Array.from({ length: 30 }, (_, i) => siteRow(5001 + i, 9001, { deployment_status: "finished" }));
  const second = [siteRow(5031, 9001, { deployment_status: "Deploying" })];

  installFetch([
    (u) => (u.pathname === "/api/orgs" ? orgPage("acme-inc") : undefined),
    (u) =>
      u.pathname === "/api/orgs/acme-inc/sites"
        ? u.searchParams.get("page[cursor]")
          ? page(second)
          : page(first, "p2")
        : undefined,
  ]);

  const out = await deploymentStatus();
  // Answering off one page would report no deploy while one is running
  expect(out.deploying).toEqual([{ siteId: 5031, site: "site-5031.com", serverId: 9001, status: "deploying" }]);
});
