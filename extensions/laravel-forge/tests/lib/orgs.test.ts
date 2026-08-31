import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";

const getCollection = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/forge", () => ({ getCollection }));

import { accounts } from "../../src/lib/accounts";
import { everyOrg, isKnownOrg, orgsFor, refreshOrgs } from "../../src/lib/orgs";

beforeEach(() => {
  __resetStorage();
  __setPreferences({ laravel_forge_api_token: "tok-1" });
  getCollection.mockReset();
});

const orgPage = (...slugs: string[]) => ({ items: slugs.map((slug) => ({ attributes: { slug } })) });

describe("orgsFor", () => {
  it("fetches once, then answers from cache", async () => {
    getCollection.mockResolvedValue(orgPage("acme-inc"));
    expect(await orgsFor(accounts()[0])).toEqual(["acme-inc"]);
    expect(await orgsFor(accounts()[0])).toEqual(["acme-inc"]);
    expect(getCollection).toHaveBeenCalledTimes(1);
  });

  it("drops orgs with no slug rather than putting an empty one in a path", async () => {
    getCollection.mockResolvedValue({ items: [{ attributes: { slug: "acme-inc" } }, { attributes: {} }] });
    expect(await orgsFor(accounts()[0])).toEqual(["acme-inc"]);
  });

  it("refreshOrgs refetches even when a list is already cached", async () => {
    getCollection.mockResolvedValueOnce(orgPage("acme-inc")).mockResolvedValueOnce(orgPage("acme-inc", "new-org"));
    expect(await orgsFor(accounts()[0])).toEqual(["acme-inc"]);
    expect(await refreshOrgs(accounts()[0])).toEqual(["acme-inc", "new-org"]);
    expect(await orgsFor(accounts()[0])).toEqual(["acme-inc", "new-org"]);
  });

  it("caches an empty org list, so a token with no orgs does not refetch every call", async () => {
    getCollection.mockResolvedValue({ items: [] });
    expect(await orgsFor(accounts()[0])).toEqual([]);
    expect(await orgsFor(accounts()[0])).toEqual([]);
    expect(getCollection).toHaveBeenCalledTimes(1);
  });
});

describe("everyOrg", () => {
  it("pairs every org with the account that reaches it", async () => {
    __setPreferences({ laravel_forge_api_token: "tok-1", laravel_forge_api_token_two: "tok-2" });
    getCollection.mockImplementation((_path: string, token: string) =>
      Promise.resolve(token === "tok-1" ? orgPage("acme-inc", "side-project") : orgPage("other-co")),
    );
    const pairs = (await everyOrg()).map(({ account, org }) => `${account.tokenKey}/${org}`);
    expect(pairs).toEqual([
      "laravel_forge_api_token/acme-inc",
      "laravel_forge_api_token/side-project",
      "laravel_forge_api_token_two/other-co",
    ]);
  });

  it("is empty when no token is configured, without calling Forge", async () => {
    __setPreferences({});
    expect(await everyOrg()).toEqual([]);
    expect(getCollection).not.toHaveBeenCalled();
  });
});

describe("isKnownOrg", () => {
  it("accepts a slug we fetched and rejects one we did not", async () => {
    getCollection.mockResolvedValue(orgPage("acme-inc"));
    expect(await isKnownOrg("laravel_forge_api_token", "acme-inc")).toBe(true);
    expect(await isKnownOrg("laravel_forge_api_token", "../../src/../user/credentials")).toBe(false);
  });

  it("rejects any org for a token that is not configured", async () => {
    getCollection.mockResolvedValue(orgPage("acme-inc"));
    expect(await isKnownOrg("laravel_forge_api_token_two", "acme-inc")).toBe(false);
  });
});
