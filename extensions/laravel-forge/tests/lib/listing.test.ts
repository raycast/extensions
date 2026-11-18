import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";

const getCollection = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/forge", async (original) => ({ ...(await original<object>()), getCollection }));

import { asCursorList, asCursors, cursorKey, perPage, queryString, usableCursors, walkOrgs } from "../../src/lib/listing";
import { rememberOrgs } from "../../src/lib/index-cache";

const T1 = "laravel_forge_api_token";
const T2 = "laravel_forge_api_token_two";

beforeEach(async () => {
  __resetStorage();
  __setPreferences({ [T1]: "tok-1" });
  getCollection.mockReset();
  getCollection.mockResolvedValue({ items: [], included: [], nextCursor: undefined });
  await rememberOrgs(T1, ["acme-inc", "side-project"]);
});

describe("perPage", () => {
  it("defaults to 15 and clamps to Forge's 1..30", () => {
    expect(perPage(undefined)).toBe(15);
    expect(perPage(0)).toBe(1);
    expect(perPage(-5)).toBe(1);
    expect(perPage(500)).toBe(30);
    expect(perPage(7.9)).toBe(7);
  });
});

describe("queryString", () => {
  it("skips blank filters and encodes the rest", () => {
    expect(queryString({ name: " acme ", region: "", size: undefined }, [], 10)).toBe(
      "page[size]=10&filter[name]=acme",
    );
  });

  it("encodes a filter value so it cannot add its own parameters", () => {
    expect(queryString({ name: "a&filter[x]=y" }, [], 15)).toBe("page[size]=15&filter[name]=a%26filter%5Bx%5D%3Dy");
  });
});

describe("usableCursors", () => {
  it("keeps a key naming an org we fetched", async () => {
    expect(await usableCursors({ [`${T1}/acme-inc`]: "abc" })).toEqual({ [`${T1}/acme-inc`]: "abc" });
  });

  it("drops a key whose org we never fetched, so it cannot reach the path", async () => {
    expect(await usableCursors({ [`${T1}/../../user/credentials`]: "abc" })).toBeUndefined();
    expect(await usableCursors({ [`${T1}/unknown-org`]: "abc" })).toBeUndefined();
  });

  it("drops a key naming a token that is not configured", async () => {
    expect(await usableCursors({ [`${T2}/acme-inc`]: "abc" })).toBeUndefined();
  });

  it("keeps the good half of a mixed map", async () => {
    const mixed = { [`${T1}/acme-inc`]: "abc", [`${T1}/../evil`]: "xyz" };
    expect(await usableCursors(mixed)).toEqual({ [`${T1}/acme-inc`]: "abc" });
  });

  it("ignores malformed shapes instead of throwing", async () => {
    expect(await usableCursors(undefined)).toBeUndefined();
    expect(await usableCursors({})).toBeUndefined();
    expect(await usableCursors({ "no-slash": "abc" })).toBeUndefined();
    expect(await usableCursors({ [`${T1}/acme-inc`]: "" })).toBeUndefined();
    expect(await usableCursors("nonsense" as never)).toBeUndefined();
  });
});

describe("walkOrgs", () => {
  it("reads every org on a first call", async () => {
    await walkOrgs((ref) => `orgs/${ref.org}/servers`, "page[size]=15");
    expect(getCollection.mock.calls.map((call) => call[0])).toEqual([
      "orgs/acme-inc/servers?page[size]=15",
      "orgs/side-project/servers?page[size]=15",
    ]);
  });

  it("reads only the orgs a cursor names on a follow-up", async () => {
    await walkOrgs((ref) => `orgs/${ref.org}/servers`, "page[size]=15", { [`${T1}/side-project`]: "cur-2" });
    expect(getCollection.mock.calls.map((call) => call[0])).toEqual(["orgs/side-project/servers?page[size]=15"]);
    expect(getCollection.mock.calls[0][2]).toMatchObject({ from: "cur-2", pages: 1 });
  });

  it("falls back to every org when the cursor map is entirely untrusted", async () => {
    await walkOrgs((ref) => `orgs/${ref.org}/servers`, "page[size]=15", { [`${T1}/../evil`]: "cur" });
    expect(getCollection.mock.calls.length).toBe(2);
  });

  it("returns a cursor only for the orgs that had more", async () => {
    getCollection
      .mockResolvedValueOnce({ items: [{ id: "1" }], included: [], nextCursor: "more" })
      .mockResolvedValueOnce({ items: [{ id: "2" }], included: [], nextCursor: undefined });
    const { rows, next } = await walkOrgs((ref) => `orgs/${ref.org}/servers`, "page[size]=15");
    expect(rows.length).toBe(2);
    expect(next).toEqual({ [`${T1}/acme-inc`]: "more" });
  });

  it("has no cursor when every org is exhausted", async () => {
    const { next } = await walkOrgs((ref) => `orgs/${ref.org}/servers`, "page[size]=15");
    expect(next).toBeUndefined();
  });

  it("tags each row with the org it came from, so the cache learns the right one", async () => {
    getCollection
      .mockResolvedValueOnce({ items: [{ id: "1" }], included: [], nextCursor: undefined })
      .mockResolvedValueOnce({ items: [{ id: "2" }], included: [], nextCursor: undefined });
    const { rows } = await walkOrgs((ref) => `orgs/${ref.org}/servers`, "page[size]=15");
    expect(rows.map((row) => `${row.item.id}@${row.ref.org}`)).toEqual(["1@acme-inc", "2@side-project"]);
  });

  it("reads only the org given when one is pinned", async () => {
    const { account } = { account: { tokenKey: T1, token: "tok-1", sshUser: "forge" } };
    await walkOrgs((ref) => `orgs/${ref.org}/sites`, "page[size]=15", undefined, [{ account, org: "acme-inc" }]);
    expect(getCollection.mock.calls.map((call) => call[0])).toEqual(["orgs/acme-inc/sites?page[size]=15"]);
  });
});

describe("cursorKey", () => {
  it("names the account as well as the org, since two accounts can share a slug", () => {
    const account = { tokenKey: T1, token: "tok-1", sshUser: "forge" };
    expect(cursorKey({ account, org: "acme-inc" })).toBe(`${T1}/acme-inc`);
  });
});

describe("cursor round-trip", () => {
  it("survives being handed out and passed back", () => {
    const out = asCursorList({ [`${T1}/acme-inc`]: "abc", [`${T1}/side-project`]: "def" });
    expect(asCursors(out)).toEqual({ [`${T1}/acme-inc`]: "abc", [`${T1}/side-project`]: "def" });
  });

  it("keeps base64 padding, which would break a split on every equals", () => {
    const out = asCursorList({ [`${T1}/acme-inc`]: "eyJpZCI6NTAwMX0==" });
    expect(asCursors(out)).toEqual({ [`${T1}/acme-inc`]: "eyJpZCI6NTAwMX0==" });
  });

  it("has no cursor at all when nothing is left to read", () => {
    expect(asCursorList({})).toBeUndefined();
    expect(asCursorList(undefined)).toBeUndefined();
  });

  it("ignores junk instead of throwing", () => {
    expect(asCursors(undefined)).toBeUndefined();
    expect(asCursors("")).toBeUndefined();
    expect(asCursors("   ")).toBeUndefined();
    expect(asCursors("no-equals-here")).toBeUndefined();
    expect(asCursors("=leading")).toBeUndefined();
    expect(asCursors("trailing=")).toBeUndefined();
  });

  it("keeps the readable half of a partly mangled cursor", () => {
    expect(asCursors(`junk;${T1}/acme-inc=abc`)).toEqual({ [`${T1}/acme-inc`]: "abc" });
  });

  it("still refuses an org we never fetched, whatever the string looked like", async () => {
    expect(await usableCursors(asCursors(`${T1}/../../user/credentials=abc`))).toBeUndefined();
  });
});
