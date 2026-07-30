import { describe, expect, it } from "vitest";
import { formatURLHost, formatURLHosts } from "../src/url-utils";

describe("URL display formatting", () => {
  it("shows only the host for web URLs", () => {
    expect(
      formatURLHost("https://example.com:8443/path/to/page?q=private#section"),
    ).toBe("example.com:8443");
    expect(formatURLHost("http://localhost:3000/search?q=private")).toBe(
      "localhost:3000",
    );
  });

  it("shows internal URL hosts without their path or query", () => {
    expect(formatURLHost("chrome://settings/privacy?q=private")).toBe(
      "settings",
    );
    expect(formatURLHost("phi://conversation/123?token=private")).toBe(
      "conversation",
    );
  });

  it("omits missing, malformed, and hostless URLs", () => {
    expect(formatURLHost(null)).toBeUndefined();
    expect(formatURLHost("not a URL")).toBeUndefined();
    expect(formatURLHost("file:///tmp/private/index.html")).toBeUndefined();
    expect(formatURLHost("about:blank")).toBeUndefined();
  });

  it("combines hosts for saved split items", () => {
    expect(
      formatURLHosts([
        "https://primary.example/path?secret=1",
        "https://secondary.example/other?secret=2",
      ]),
    ).toBe("primary.example • secondary.example");
    expect(formatURLHosts([null, "file:///tmp/index.html"])).toBeUndefined();
  });
});
