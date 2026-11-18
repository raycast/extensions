import { describe, expect, it } from "vitest";
import { detectPlatform, PLATFORMS, platformTarget } from "../src/catalog/platforms";
import { checkProfile } from "../src/helpers/detect";

/** Answers each request from a table of URL → [status, body]; anything else is a 404 */
function siteFetch(routes: Record<string, [number, string]>) {
  const seen: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    seen.push(url);
    const [status, body] = routes[url] ?? [404, "not found"];
    return new Response(status === 204 ? null : body, { status });
  }) as typeof fetch;
  return { fetchImpl, seen };
}

// Response shapes captured from mastodon.social, lemmy.world, discuss.python.org and gitlab.com, 2026-11-08
const MASTODON_INSTANCE = '{"uri":"social.example","title":"Example","version":"4.3.0"}';
const LEMMY_SITE = '{"site_view":{"site":{"id":1,"name":"Example"}},"version":"0.19.5"}';
const DISCOURSE_SITE = '{"default_archetype":"regular","notification_types":{"mentioned":1}}';

describe("detectPlatform", () => {
  it.each([
    ["mastodon", "https://social.example/api/v1/instance", MASTODON_INSTANCE],
    ["lemmy", "https://social.example/api/v3/site", LEMMY_SITE],
    ["discourse", "https://social.example/site.json", DISCOURSE_SITE],
    ["gitlab", "https://social.example/api/v4/users?username=root", "[]"],
  ])("recognizes %s from its fingerprint", async (platform, url, body) => {
    const { fetchImpl } = siteFetch({ [url]: [200, body] });
    expect(await detectPlatform("https://social.example/@{profile}", { fetchImpl })).toBe(platform);
  });

  it("returns undefined for a site that matches no fingerprint", async () => {
    const { fetchImpl } = siteFetch({ "https://social.example/site.json": [200, "<html>not discourse</html>"] });
    expect(await detectPlatform("https://social.example/{profile}", { fetchImpl })).toBeUndefined();
  });

  it("probes the template's origin, not its path", async () => {
    const { fetchImpl, seen } = siteFetch({});
    await detectPlatform("https://www.social.example/community/u/{profile}/summary", { fetchImpl });
    expect(seen.every((url) => url.startsWith("https://www.social.example/"))).toBe(true);
    expect(seen.some((url) => url.includes("{profile}"))).toBe(false);
  });

  it("says so when a site fails every request, instead of reporting no platform", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(detectPlatform("https://social.example/{profile}", { fetchImpl })).rejects.toThrow(
      "Couldn't reach social.example",
    );
  });
});

describe("platformTarget", () => {
  it("checks a Mastodon profile with the account lookup API", async () => {
    const target = platformTarget("mastodon", "https://social.example/@{profile}");
    const { fetchImpl, seen } = siteFetch({
      "https://social.example/api/v1/accounts/lookup?acct=example_user": [200, '{"id":"1"}'],
    });
    expect((await checkProfile(target, "example_user", { fetchImpl })).status).toBe("found");
    expect((await checkProfile(target, "someone_else", { fetchImpl })).status).toBe("not-found");
    expect(seen[0]).toBe("https://social.example/api/v1/accounts/lookup?acct=example_user");
  });

  it("checks Discourse, Lemmy and GitLab through each one's API", async () => {
    const discourse = platformTarget("discourse", "https://forum.example/u/{profile}/summary");
    const lemmy = platformTarget("lemmy", "https://lemmy.example/u/{profile}");
    const gitlab = platformTarget("gitlab", "https://git.example/{profile}");
    const { fetchImpl } = siteFetch({
      "https://forum.example/u/example_user.json": [200, "{}"],
      "https://lemmy.example/api/v3/user?username=example_user": [200, "{}"],
      "https://git.example/api/v4/users?username=example_user": [200, '[{"id":1}]'],
      "https://git.example/api/v4/users?username=someone_else": [200, "[]"],
    });
    for (const target of [discourse, lemmy, gitlab]) {
      expect((await checkProfile(target, "example_user", { fetchImpl })).status).toBe("found");
      expect((await checkProfile(target, "someone_else", { fetchImpl })).status).toBe("not-found");
    }
  });

  it("rejects usernames each platform can't have", async () => {
    const { fetchImpl, seen } = siteFetch({});
    for (const id of Object.keys(PLATFORMS) as (keyof typeof PLATFORMS)[]) {
      const target = platformTarget(id, "https://site.example/{profile}");
      expect((await checkProfile(target, "has space", { fetchImpl })).status).toBe("invalid");
    }
    expect(seen).toHaveLength(0);
  });
});
