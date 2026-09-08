import { beforeEach, describe, expect, it } from "vitest";
import { __resetStorage, __setPreferences } from "../helpers/raycast-stub";
import { locate, locateSite, serverPath } from "../../src/lib/coordinates";
import { lookup, remember } from "../../src/lib/index-cache";

const T1 = "laravel_forge_api_token";

beforeEach(() => {
  __resetStorage();
  __setPreferences({ [T1]: "tok-1" });
});

describe("locate", () => {
  it("returns the account and org a list call stored", async () => {
    await remember("server", 9001, { tokenKey: T1, org: "acme-inc" });
    const at = await locate("server", 9001);
    expect(at.org).toBe("acme-inc");
    expect(at.account.token).toBe("tok-1");
  });

  it("tells the model to list first rather than searching for an unknown id", async () => {
    await expect(locate("server", 9001)).rejects.toThrow(/Call list-servers now/);
  });

  it("names the right list tool for a site", async () => {
    await expect(locate("site", 5001)).rejects.toThrow(/Call list-sites now/);
  });

  it("drops an entry whose token has since been removed from preferences", async () => {
    await remember("server", 9001, { tokenKey: "laravel_forge_api_token_two", org: "other-co" });
    await expect(locate("server", 9001)).rejects.toThrow(/Call list-servers now/);
    expect(await lookup("server", 9001)).toBeUndefined();
  });
});

describe("locateSite", () => {
  it("returns the server id alongside the org", async () => {
    await remember("site", 5001, { tokenKey: T1, org: "acme-inc", serverId: 9001 });
    expect(await locateSite(5001)).toMatchObject({ org: "acme-inc", serverId: 9001 });
  });

  it("refuses a site cached without its server, since the path needs one", async () => {
    await remember("site", 5001, { tokenKey: T1, org: "acme-inc" });
    await expect(locateSite(5001)).rejects.toThrow(/Call list-sites now/);
    expect(await lookup("site", 5001)).toBeUndefined();
  });
});

describe("paths", () => {
  it("builds a server path with an optional tail", () => {
    expect(serverPath({ org: "acme-inc" }, 9001)).toBe("orgs/acme-inc/servers/9001");
    expect(serverPath({ org: "acme-inc" }, 9001, "/events")).toBe("orgs/acme-inc/servers/9001/events");
  });
});
