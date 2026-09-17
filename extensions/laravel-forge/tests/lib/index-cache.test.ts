import { beforeEach, describe, expect, it } from "vitest";
import { __resetStorage } from "../helpers/raycast-stub";
import { forget, forgetOrgs, knownOrgs, lookup, remember, rememberMany, rememberOrgs } from "../../src/lib/index-cache";

beforeEach(() => __resetStorage());

describe("orgs", () => {
  it("round-trips per token", async () => {
    await rememberOrgs("t1", ["acme-inc", "side-project"]);
    expect(await knownOrgs("t1")).toEqual(["acme-inc", "side-project"]);
  });

  it("is undefined before anything is stored, so a caller can tell cold from empty", async () => {
    expect(await knownOrgs("t1")).toBeUndefined();
    await rememberOrgs("t1", []);
    expect(await knownOrgs("t1")).toEqual([]);
  });

  it("keeps two accounts apart", async () => {
    await rememberOrgs("t1", ["acme-inc"]);
    await rememberOrgs("t2", ["other-co"]);
    expect(await knownOrgs("t1")).toEqual(["acme-inc"]);
    expect(await knownOrgs("t2")).toEqual(["other-co"]);
  });

  it("keeps both accounts when they are written at the same time", async () => {
    await Promise.all([rememberOrgs("t1", ["acme-inc"]), rememberOrgs("t2", ["other-co"])]);
    expect(await knownOrgs("t1")).toEqual(["acme-inc"]);
    expect(await knownOrgs("t2")).toEqual(["other-co"]);
  });

  it("forgets one account without touching the other", async () => {
    await rememberOrgs("t1", ["acme-inc"]);
    await rememberOrgs("t2", ["other-co"]);
    await forgetOrgs("t1");
    expect(await knownOrgs("t1")).toBeUndefined();
    expect(await knownOrgs("t2")).toEqual(["other-co"]);
  });
});

describe("coordinates", () => {
  it("round-trips a site with its server", async () => {
    await remember("site", 5001, { tokenKey: "t1", org: "acme-inc", serverId: 9001 });
    expect(await lookup("site", 5001)).toEqual({ tokenKey: "t1", org: "acme-inc", serverId: 9001 });
  });

  it("takes a numeric or string id interchangeably", async () => {
    await remember("server", 9001, { tokenKey: "t1", org: "acme-inc" });
    expect(await lookup("server", "9001")).toEqual({ tokenKey: "t1", org: "acme-inc" });
  });

  it("keeps site and server ids in separate namespaces", async () => {
    await remember("site", 42, { tokenKey: "t1", org: "acme-inc", serverId: 9001 });
    await remember("server", 42, { tokenKey: "t2", org: "other-co" });
    expect(await lookup("site", 42)).toMatchObject({ org: "acme-inc" });
    expect(await lookup("server", 42)).toMatchObject({ org: "other-co" });
  });

  it("refuses an entry missing a token or org rather than caching a dead end", async () => {
    await remember("site", 1, { tokenKey: "", org: "acme-inc" });
    await remember("site", 2, { tokenKey: "t1", org: "" });
    expect(await lookup("site", 1)).toBeUndefined();
    expect(await lookup("site", 2)).toBeUndefined();
  });

  it("evicts one id and leaves the rest", async () => {
    await remember("site", 5001, { tokenKey: "t1", org: "acme-inc", serverId: 9001 });
    await remember("site", 5002, { tokenKey: "t1", org: "acme-inc", serverId: 9001 });
    await forget("site", 5001);
    expect(await lookup("site", 5001)).toBeUndefined();
    expect(await lookup("site", 5002)).toBeDefined();
  });

  it("writes a whole page at once and drops only the unusable rows", async () => {
    await rememberMany("site", [
      [5001, { tokenKey: "t1", org: "acme-inc", serverId: 9001 }],
      [5002, { tokenKey: "t1", org: "acme-inc", serverId: 9001 }],
      [5003, { tokenKey: "t1", org: "", serverId: 9001 }],
    ]);
    expect(await lookup("site", 5001)).toBeDefined();
    expect(await lookup("site", 5002)).toBeDefined();
    expect(await lookup("site", 5003)).toBeUndefined();
  });

  it("survives a corrupt blob by starting over instead of throwing", async () => {
    const { LocalStorage } = await import("../helpers/raycast-stub");
    await LocalStorage.setItem("forge:index", "{not json");
    expect(await lookup("site", 5001)).toBeUndefined();
    await remember("site", 5001, { tokenKey: "t1", org: "acme-inc" });
    expect(await lookup("site", 5001)).toBeDefined();
  });

  it("keeps orgs when a coordinate is written, and vice versa", async () => {
    await rememberOrgs("t1", ["acme-inc"]);
    await remember("site", 5001, { tokenKey: "t1", org: "acme-inc" });
    expect(await knownOrgs("t1")).toEqual(["acme-inc"]);
    expect(await lookup("site", 5001)).toBeDefined();
  });
});
