import { describe, expect, it } from "vitest";
import { TextCleaner } from "../src/lib/text-cleaner";
import { URLQueryParamRules } from "../src/lib/url-rules";

const defaultRules = URLQueryParamRules.parseCustomRules(URLQueryParamRules.defaultRulesText);

describe("strip URL query params", () => {
  const cleaner = new TextCleaner();

  it("strips all query params from an unknown domain", () => {
    expect(cleaner.stripURLQueryParams("https://example.com/article?utm_source=twitter&utm_medium=social")).toBe(
      "https://example.com/article",
    );
  });

  it("strips a single query param", () => {
    expect(cleaner.stripURLQueryParams("https://shop.example.com/product?ref=homepage")).toBe(
      "https://shop.example.com/product",
    );
  });

  it("returns null when the URL has no query params", () => {
    expect(cleaner.stripURLQueryParams("https://example.com/article")).toBeNull();
  });

  it("ignores non-URL text", () => {
    expect(cleaner.stripURLQueryParams("just some text")).toBeNull();
  });

  it("ignores multiline text", () => {
    expect(cleaner.stripURLQueryParams("https://example.com?foo=1\nhttps://other.com?bar=2")).toBeNull();
  });

  it("preserves path and fragment", () => {
    expect(cleaner.stripURLQueryParams("https://example.com/path?utm_source=email#section")).toBe(
      "https://example.com/path#section",
    );
  });

  it("works with http", () => {
    expect(cleaner.stripURLQueryParams("http://example.com/page?ref=old")).toBe("http://example.com/page");
  });

  it("returns null when every param is in the keeping set", () => {
    expect(cleaner.stripURLQueryParams("https://example.com/watch?v=abc", new Set(["v"]))).toBeNull();
  });

  it("keeps specified params and strips others", () => {
    expect(cleaner.stripURLQueryParams("https://example.com/watch?v=abc&utm_source=twitter", new Set(["v"]))).toBe(
      "https://example.com/watch?v=abc",
    );
  });

  it("preserves percent-encoding in kept params", () => {
    expect(cleaner.stripURLQueryParams("https://example.com/file?node-id=42%3A1&ref=foo", new Set(["node-id"]))).toBe(
      "https://example.com/file?node-id=42%3A1",
    );
  });
});

describe("URL keep-param rules", () => {
  it("includes youtube", () => {
    expect(URLQueryParamRules.keepParams("www.youtube.com", defaultRules)).toEqual(new Set(["v", "list", "t"]));
  });

  it("matches hosts case-insensitively", () => {
    expect(URLQueryParamRules.keepParams("WWW.YouTube.COM", defaultRules)).toEqual(new Set(["v", "list", "t"]));
  });

  it("includes youtu.be", () => {
    expect(URLQueryParamRules.keepParams("youtu.be", defaultRules)).toEqual(new Set(["t"]));
  });

  it("returns an empty keep list for an unknown domain", () => {
    expect(URLQueryParamRules.keepParams("example.com", defaultRules).size).toBe(0);
  });

  it("strips YouTube tracking and keeps the video id", () => {
    const keeping = URLQueryParamRules.keepParams("www.youtube.com", defaultRules);
    expect(
      new TextCleaner().stripURLQueryParams("https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=twitter", keeping),
    ).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("keeps a YouTube timestamp alongside the video id", () => {
    const keeping = URLQueryParamRules.keepParams("www.youtube.com", defaultRules);
    expect(
      new TextCleaner().stripURLQueryParams(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=142&utm_campaign=viral",
        keeping,
      ),
    ).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=142");
  });

  it("returns null when YouTube only has kept params", () => {
    const keeping = URLQueryParamRules.keepParams("www.youtube.com", defaultRules);
    expect(new TextCleaner().stripURLQueryParams("https://www.youtube.com/watch?v=dQw4w9WgXcQ", keeping)).toBeNull();
  });

  it("keeps a youtu.be timestamp and strips tracking", () => {
    const keeping = URLQueryParamRules.keepParams("youtu.be", defaultRules);
    expect(new TextCleaner().stripURLQueryParams("https://youtu.be/dQw4w9WgXcQ?t=42&si=trackingparam", keeping)).toBe(
      "https://youtu.be/dQw4w9WgXcQ?t=42",
    );
  });

  it("keeps the Google Docs tab param", () => {
    const keeping = URLQueryParamRules.keepParams("docs.google.com", defaultRules);
    expect(
      new TextCleaner().stripURLQueryParams(
        "https://docs.google.com/document/d/1ABC/edit?tab=t.0&usp=sharing",
        keeping,
      ),
    ).toBe("https://docs.google.com/document/d/1ABC/edit?tab=t.0");
  });

  it("keeps the GitHub tab param", () => {
    const keeping = URLQueryParamRules.keepParams("github.com", defaultRules);
    expect(
      new TextCleaner().stripURLQueryParams("https://github.com/steipete/Trimmy?tab=issues&foo=bar", keeping),
    ).toBe("https://github.com/steipete/Trimmy?tab=issues");
  });

  it("keeps a Figma node id and preserves encoding", () => {
    const keeping = URLQueryParamRules.keepParams("www.figma.com", defaultRules);
    expect(
      new TextCleaner().stripURLQueryParams(
        "https://www.figma.com/file/abc123/Design?node-id=42%3A1&ref=something",
        keeping,
      ),
    ).toBe("https://www.figma.com/file/abc123/Design?node-id=42%3A1");
  });

  it("lets custom rules override a domain", () => {
    const rules = URLQueryParamRules.parseCustomRules("youtube.com: myParam");
    expect(URLQueryParamRules.keepParams("www.youtube.com", rules)).toEqual(new Set(["myParam"]));
  });

  it("applies custom rules to unlisted domains", () => {
    const rules = URLQueryParamRules.parseCustomRules("myapp.internal: id");
    expect(URLQueryParamRules.keepParams("myapp.internal", rules)).toEqual(new Set(["id"]));
  });

  it("parses custom rules with extra whitespace", () => {
    const rules = URLQueryParamRules.parseCustomRules("  example.com : foo , bar  \nother.io: baz");
    expect(rules).toHaveLength(2);
    expect(rules[0].domain).toBe("example.com");
    expect(rules[0].keepParams).toEqual(new Set(["foo", "bar"]));
    expect(rules[1].domain).toBe("other.io");
    expect(rules[1].keepParams).toEqual(new Set(["baz"]));
  });

  it("ignores blank lines and malformed rules", () => {
    const rules = URLQueryParamRules.parseCustomRules("\nexample.com: v\n\nnodomain\n");
    expect(rules).toHaveLength(1);
    expect(rules[0].domain).toBe("example.com");
  });

  it("round-trips the default rules text through the parser", () => {
    const rules = URLQueryParamRules.parseCustomRules(URLQueryParamRules.defaultRulesText);
    expect(rules).toHaveLength(URLQueryParamRules.builtIn.length);
  });
});
