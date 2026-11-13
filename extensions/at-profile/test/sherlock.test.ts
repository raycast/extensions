import { describe, expect, it } from "vitest";
import { findCatalogSiteByName } from "../src/catalog";
import { gradeProbe, normalizeSherlock } from "../src/catalog/sherlock";

// Shapes copied from Sherlock's data.json; the usernames are its own test accounts
const RAW = {
  $schema: "data.schema.json",
  GitHub: {
    errorType: "status_code",
    regexCheck: "^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$",
    url: "https://www.github.com/{}",
    urlMain: "https://www.github.com/",
    username_claimed: "blue",
  },
  Medium: {
    errorMsg: "<body",
    errorType: "message",
    url: "https://medium.com/@{}",
    urlMain: "https://medium.com/",
    urlProbe: "https://medium.com/feed/@{}",
    username_claimed: "blue",
  },
  WordPress: {
    errorType: "response_url",
    errorUrl: "wordpress.com/typo/?subdomain=",
    url: "https://{}.wordpress.com/",
    urlMain: "https://wordpress.com",
    username_claimed: "blue",
  },
  Discord: {
    errorType: "message",
    url: "https://discord.com",
    urlMain: "https://discord.com/",
    urlProbe: "https://discord.com/api/v9/unique-username/username-attempt-unauthed",
    errorMsg: ['"taken":false'],
    request_method: "POST",
    request_payload: { username: "{}" },
    headers: { "Content-Type": "application/json" },
    username_claimed: "blue",
  },
  "Some Adult Site": {
    errorType: ["status_code", "message"],
    errorMsg: ["not found"],
    errorCode: [204],
    url: "https://adult.example/{}",
    urlMain: "https://adult.example/",
    username_claimed: "blue",
    isNSFW: true,
    regexCheck: "^(?P<bad>python-only)$",
  },
};

describe("Sherlock's Python username rules", () => {
  it("reads an open-ended length limit like {,34} the way Python does", () => {
    const [site] = normalizeSherlock({
      Example: {
        errorType: "status_code",
        url: "https://example.com/{}",
        urlMain: "https://example.com/",
        username_claimed: "example_user",
        regexCheck: "^[\\w-]{,34}$",
      },
    });
    const pattern = new RegExp(site.usernamePattern ?? "");
    expect(pattern.test("example_user")).toBe(true);
    expect(pattern.test("x".repeat(35))).toBe(false);
  });

  it("leaves {,n} alone inside a character class or after a single backslash, and converts it after an escaped one", () => {
    const patternOf = (regexCheck: string) =>
      normalizeSherlock({
        Example: {
          errorType: "status_code",
          url: "https://example.com/{}",
          urlMain: "https://example.com/",
          username_claimed: "example_user",
          regexCheck,
        },
      })[0].usernamePattern;
    expect(patternOf("^[{,3}]$")).toBe("^[{,3}]$");
    expect(patternOf("^a\\{,3}$")).toBe("^a\\{,3}$");
    expect(patternOf("^a\\\\{,3}$")).toBe("^a\\\\{0,3}$");
    expect(patternOf("^[\\]]{,3}$")).toBe("^[\\]]{0,3}$");
  });
});

describe("normalizeSherlock", () => {
  const sites = normalizeSherlock(RAW);
  const byName = new Map(sites.map((site) => [site.name, site]));

  it("keeps every site but the schema pointer", () => {
    expect(sites.map((site) => site.name)).toEqual(["GitHub", "Medium", "WordPress", "Discord", "Some Adult Site"]);
  });

  it("turns Sherlock's {} into {profile} and its errorType into signals", () => {
    expect(byName.get("GitHub")).toMatchObject({
      id: "catalog-github",
      urlTemplate: "https://www.github.com/{profile}",
      homepage: "https://www.github.com/",
      usernamePattern: "^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$",
      knownUsername: "blue",
      nsfw: false,
      check: { signals: ["status"] },
    });
    expect(byName.get("Medium")?.check).toEqual({
      signals: ["message"],
      probeUrl: "https://medium.com/feed/@{profile}",
      notFoundText: ["<body"],
    });
    expect(byName.get("WordPress")?.check.signals).toEqual(["redirect"]);
  });

  it("leaves out the profile URL of a site that has no profile page", () => {
    const discord = byName.get("Discord");
    expect(discord?.urlTemplate).toBeUndefined();
    expect(discord?.check).toMatchObject({
      method: "POST",
      body: '{"username":"{profile}"}',
      headers: { "Content-Type": "application/json" },
    });
  });

  it("keeps NSFW flags, status lists and combined signals, and drops a regex JavaScript can't run", () => {
    const adult = byName.get("Some Adult Site");
    expect(adult).toMatchObject({ nsfw: true, check: { signals: ["status", "message"], notFoundStatus: [204] } });
    expect(adult?.usernamePattern).toBeUndefined();
  });
});

describe("excluded sites", () => {
  it("leaves out lookups in breach data, which aren't profiles", () => {
    const sites = normalizeSherlock({
      ...RAW,
      HudsonRock: { ...RAW.GitHub, url: "https://cavalier.hudsonrock.com/search?username={}" },
      "BreachSta.rs Forum": { ...RAW.GitHub, url: "https://breachsta.rs/profile/{}" },
    });
    expect(sites.map((site) => site.name)).not.toContain("HudsonRock");
    expect(sites.map((site) => site.name)).not.toContain("BreachSta.rs Forum");
  });
});

describe("gradeProbe", () => {
  it.each([
    ["found", "not-found", "works"],
    ["found", "invalid", "unverified"],
    ["found", "found", "unreliable"],
    ["not-found", "not-found", "unreliable"],
    ["blocked", "blocked", "unverified"],
    ["found", "blocked", "unverified"],
    ["error", "not-found", "unverified"],
  ] as const)("known %s, nonsense %s → %s", (known, nonsense, grade) => {
    expect(gradeProbe(known, nonsense)).toBe(grade);
  });
});

describe("catalog IDs", () => {
  // History, favorites and added apps are keyed by these IDs, so a change to the slug would orphan them
  it("names a site catalog- plus a slug of its name, the same on every sync", () => {
    const [site] = normalizeSherlock({ "DEV Community": { ...RAW.GitHub, url: "https://dev.to/{}" } });
    expect(site.id).toBe("catalog-dev-community");
    expect(findCatalogSiteByName("GitHub")?.id).toBe("catalog-github");
  });
});
