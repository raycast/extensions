import { beforeEach, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { installFetch, orgPage, page, serverRow } from "../helpers/forge-mock";
import { Server } from "../../src/api/Server";
import { rememberOrgs } from "../../src/lib/index-cache";

const T1 = "laravel_forge_api_token";

const fleet = (ids: number[], size: number) => (cursor: string | null) => {
  const start = cursor ? ids.indexOf(Number(cursor)) + 1 : 0;
  const slice = ids.slice(start, start + size);
  return page(
    slice.map((id) => serverRow(id)),
    start + slice.length < ids.length ? String(slice.at(-1)) : null,
  );
};

const serve = (ids: number[]) =>
  installFetch([
    (u) => (u.pathname === "/api/orgs" ? orgPage("kevin-batdorf") : undefined),
    (u) =>
      u.pathname === "/api/orgs/kevin-batdorf/servers" ? fleet(ids, 2)(u.searchParams.get("page[cursor]")) : undefined,
  ]);

beforeEach(async () => {
  __resetStorage();
  __setPreferences({ [T1]: "tok-1" });
  vi.unstubAllGlobals();
  await rememberOrgs(T1, ["kevin-batdorf"]);
});

it("drops a server that left the org from the last page", async () => {
  serve([1, 2, 3, 4, 5]);
  const first = await Server.walk();
  serve([1, 2, 3, 4]);
  const caught = await Server.catchUp(first.servers, first.tail);
  expect(caught?.servers.map((s) => s.id)).toEqual([1, 2, 3, 4]);
});

// The cursor reads "id greater than X", so a row removed before X is invisible here
it("cannot see a server that left the org from an earlier page", async () => {
  serve([1, 2, 3, 4, 5]);
  const first = await Server.walk();
  serve([1, 3, 4, 5]);
  const caught = await Server.catchUp(first.servers, first.tail);
  expect(caught?.servers.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
});
