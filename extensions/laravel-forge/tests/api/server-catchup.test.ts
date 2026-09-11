import { beforeEach, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { calls, installFetch, orgPage, page, serverRow } from "../helpers/forge-mock";
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

it("adds the new server from the page it re-read, without walking again", async () => {
  serve([1, 2, 3, 4, 5]);
  const first = await Server.walk();
  expect(first.servers.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
  const walked = calls.length;

  serve([1, 2, 3, 4, 5, 6]);
  const caught = await Server.catchUp(first.servers, first.tail);
  expect(caught?.servers.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(calls.length).toBeLessThan(walked);
});

it("costs one request when nothing moved", async () => {
  serve([1, 2, 3, 4, 5]);
  const first = await Server.walk();

  serve([1, 2, 3, 4, 5]);
  const caught = await Server.catchUp(first.servers, first.tail);
  expect(caught?.servers.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
  expect(calls.length).toBe(1);
});

it("gives up when an org appears that the cache never saw", async () => {
  serve([1, 2]);
  const first = await Server.walk();
  await rememberOrgs(T1, ["kevin-batdorf", "second-org"]);
  expect(await Server.catchUp(first.servers, first.tail)).toBeNull();
});
