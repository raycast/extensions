import { describe, expect, it } from "vitest";

import { apiUrl, applyAuth, entityUrl, normaliseBaseUrl, redact } from "./url";
import { TargetprocessError } from "./types";

describe("normaliseBaseUrl", () => {
  it("keeps a plain hosted instance unchanged", () => {
    expect(normaliseBaseUrl("https://acme.tpondemand.com")).toBe("https://acme.tpondemand.com");
  });

  it("assumes https when no scheme is given", () => {
    expect(normaliseBaseUrl("acme.tpondemand.com")).toBe("https://acme.tpondemand.com");
  });

  it("strips trailing slashes", () => {
    expect(normaliseBaseUrl("https://acme.tpondemand.com///")).toBe("https://acme.tpondemand.com");
  });

  it("preserves an on-premise path prefix", () => {
    expect(normaliseBaseUrl("https://tools.corp.local/TargetProcess/")).toBe("https://tools.corp.local/TargetProcess");
  });

  it("keeps a non-default port", () => {
    expect(normaliseBaseUrl("http://tools.corp.local:8080/tp")).toBe("http://tools.corp.local:8080/tp");
  });

  it("drops a pasted API path", () => {
    expect(normaliseBaseUrl("https://acme.tpondemand.com/api/v1")).toBe("https://acme.tpondemand.com");
    expect(normaliseBaseUrl("https://tools.corp.local/tp/api/v2/")).toBe("https://tools.corp.local/tp");
  });

  it("drops a query string or fragment", () => {
    expect(normaliseBaseUrl("https://acme.tpondemand.com/?foo=bar#baz")).toBe("https://acme.tpondemand.com");
  });

  it("trims surrounding whitespace", () => {
    expect(normaliseBaseUrl("  https://acme.tpondemand.com  ")).toBe("https://acme.tpondemand.com");
  });

  it("rejects empty input with an actionable message", () => {
    expect(() => normaliseBaseUrl("   ")).toThrow(TargetprocessError);
    expect(() => normaliseBaseUrl("   ")).toThrow(/Enter the URL/);
  });

  it("rejects something that is not a URL", () => {
    expect(() => normaliseBaseUrl("http://")).toThrow(TargetprocessError);
  });
});

describe("entityUrl", () => {
  it("builds the canonical entity link", () => {
    expect(entityUrl("https://acme.tpondemand.com", 145322)).toBe("https://acme.tpondemand.com/entity/145322");
  });

  it("respects a path prefix", () => {
    expect(entityUrl("https://tools.corp.local/tp/", 7)).toBe("https://tools.corp.local/tp/entity/7");
  });
});

describe("apiUrl", () => {
  it("always asks for JSON", () => {
    expect(apiUrl("https://acme.tpondemand.com", "api/v1/Context").toString()).toBe(
      "https://acme.tpondemand.com/api/v1/Context?format=json",
    );
  });

  it("tolerates a leading slash on the path", () => {
    expect(apiUrl("https://acme.tpondemand.com", "/api/v1/Context").pathname).toBe("/api/v1/Context");
  });

  it("appends the path after a prefix rather than replacing it", () => {
    expect(apiUrl("https://tools.corp.local/tp", "api/v1/Assignables").pathname).toBe("/tp/api/v1/Assignables");
  });

  it("encodes parameters and omits undefined ones", () => {
    const url = apiUrl("https://acme.tpondemand.com", "api/v1/Assignables", {
      take: 50,
      where: "(AssignedUser.Id eq 42)",
      include: undefined,
    });
    expect(url.searchParams.get("take")).toBe("50");
    expect(url.searchParams.get("where")).toBe("(AssignedUser.Id eq 42)");
    expect(url.searchParams.has("include")).toBe(false);
    expect(url.toString()).toContain("where=%28AssignedUser.Id+eq+42%29");
  });

  it("never carries a token on its own", () => {
    expect(apiUrl("https://acme.tpondemand.com", "api/v1/Context").toString()).not.toContain("access_token");
  });
});

describe("applyAuth", () => {
  const token = "s3cret-token";

  it("puts a bearer token in the header and leaves the URL clean", () => {
    const url = apiUrl("https://acme.tpondemand.com", "api/v1/Context");
    const headers = new Headers();
    applyAuth(url, headers, token, "bearer");
    expect(headers.get("Authorization")).toBe(`Bearer ${token}`);
    expect(url.toString()).not.toContain(token);
  });

  it("base64-encodes a basic token as the username", () => {
    const url = apiUrl("https://acme.tpondemand.com", "api/v1/Context");
    const headers = new Headers();
    applyAuth(url, headers, token, "basic");
    expect(headers.get("Authorization")).toBe(`Basic ${Buffer.from(`${token}:`).toString("base64")}`);
  });

  it("falls back to the query parameter and sets no header", () => {
    const url = apiUrl("https://acme.tpondemand.com", "api/v1/Context");
    const headers = new Headers();
    applyAuth(url, headers, token, "query");
    expect(url.searchParams.get("access_token")).toBe(token);
    expect(headers.get("Authorization")).toBeNull();
  });
});

describe("redact", () => {
  const token = "s3cret token+value";

  it("removes the raw token", () => {
    expect(redact(`Authorization: Bearer ${token}`, token)).toBe("Authorization: Bearer <token>");
  });

  it("removes the percent-encoded token, which is how it appears in a URL", () => {
    const url = apiUrl("https://acme.tpondemand.com", "api/v1/Context");
    applyAuth(url, new Headers(), token, "query");
    expect(url.toString()).not.toContain("<token>");
    expect(redact(url.toString(), token)).not.toContain("s3cret");
  });

  it("catches the form encoding URLSearchParams produces, where a space is a plus", () => {
    const spaced = "s3cret with spaces";
    const url = apiUrl("https://acme.tpondemand.com", "api/v1/Context");
    applyAuth(url, new Headers(), spaced, "query");
    expect(url.toString()).toContain("s3cret+with+spaces");
    expect(redact(url.toString(), spaced)).toBe(
      "https://acme.tpondemand.com/api/v1/Context?format=json&access_token=<token>",
    );
  });

  it("catches percent encoding too", () => {
    const symbols = "a/b+c=d";
    const url = apiUrl("https://acme.tpondemand.com", "api/v1/Context");
    applyAuth(url, new Headers(), symbols, "query");
    expect(redact(url.toString(), symbols)).toBe(
      "https://acme.tpondemand.com/api/v1/Context?format=json&access_token=<token>",
    );
  });

  it("is a no-op for an empty token", () => {
    expect(redact("nothing to hide", "")).toBe("nothing to hide");
  });
});
