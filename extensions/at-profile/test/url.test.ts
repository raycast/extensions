import { describe, expect, it } from "vitest";
import { buildProfileUrl, generateAppValue, normalizeUrlTemplate, validateUrlTemplate } from "../src/helpers/url";
import { defaultApps } from "../src/utils/default-apps";

describe("buildProfileUrl", () => {
  it("puts exactly one @ in an @{profile} template, however the profile was typed", () => {
    expect(buildProfileUrl("https://www.threads.net/@{profile}", "i.m.4.n.i")).toBe(
      "https://www.threads.net/@i.m.4.n.i",
    );
    expect(buildProfileUrl("https://www.threads.net/@{profile}", "@i.m.4.n.i")).toBe(
      "https://www.threads.net/@i.m.4.n.i",
    );
  });

  it("drops a typed @ for templates without one", () => {
    expect(buildProfileUrl("https://x.com/{profile}", " @chrismessina ")).toBe("https://x.com/chrismessina");
  });

  it("encodes the profile and fills every placeholder", () => {
    expect(buildProfileUrl("https://example.com/{profile}?ref={profile}", "a b")).toBe(
      "https://example.com/a%20b?ref=a%20b",
    );
  });

  it("rejects an empty profile and non-http templates", () => {
    expect(() => buildProfileUrl("https://x.com/{profile}", "@ ")).toThrow("Please enter a profile");
    expect(() => buildProfileUrl("javascript:alert({profile})", "x")).toThrow("Disallowed protocol");
  });
});

describe("generateAppValue", () => {
  it.each([
    ["https://www.producthunt.com/@{profile}", "producthunt-com"],
    ["https://www.reddit.com/user/{profile}", "reddit-com-user"],
    ["https://mastodon.social/@{profile}", "mastodon-social"],
    ["https://{profile}.substack.com", "substack-com"],
    ["https://m.example.co.uk/u/{profile}/posts", "example-co-uk-u"],
  ])("%s → %s", (template, value) => {
    expect(generateAppValue(template)).toBe(value);
  });
});

describe("normalizeUrlTemplate", () => {
  it("treats www, http and a trailing slash as the same service", () => {
    expect(normalizeUrlTemplate("http://www.example.com/{profile}/")).toBe(
      normalizeUrlTemplate("https://example.com/{profile}"),
    );
  });

  it("doesn't mangle hosts containing the old stand-in word", () => {
    expect(normalizeUrlTemplate("https://testflight.example.com/{profile}")).toBe(
      "https://testflight.example.com/{profile}",
    );
  });
});

describe("validateUrlTemplate", () => {
  it("accepts every built-in template", () => {
    expect(defaultApps.length).toBeGreaterThan(0);
    for (const app of defaultApps) expect(validateUrlTemplate(app.urlTemplate)).toBeUndefined();
  });

  it("explains what's wrong", () => {
    expect(validateUrlTemplate("https://example.com/")).toMatch("{profile}");
    expect(validateUrlTemplate("ftp://example.com/{profile}")).toMatch("http");
  });
});
