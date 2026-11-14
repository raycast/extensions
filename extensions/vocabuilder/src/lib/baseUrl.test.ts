import { describe, it, expect } from "vitest";
import { customEndpointHost, hostForLog, resolveBaseUrl } from "./baseUrl";
import { isProviderError } from "./providerError";
import { PROVIDER_IDS, type ProviderId } from "./providers/types";

function expectRejected(raw: string | undefined, provider: ProviderId = "gemini") {
  try {
    resolveBaseUrl(raw, provider, "translate");
  } catch (err) {
    expect(isProviderError(err)).toBe(true);
    if (!isProviderError(err)) return;
    expect(err.cause).toMatchObject({ domain: "infrastructure", kind: "invalid-base-url", provider });
    return;
  }
  throw new Error(`expected ${JSON.stringify(raw)} to be rejected for ${provider}`);
}

describe("resolveBaseUrl — gemini", () => {
  it.each([
    ["https://gw.corp/gemini", "https://gw.corp/gemini/v1beta/models"],
    ["https://gw.corp/gemini/v1beta", "https://gw.corp/gemini/v1beta/models"],
    ["https://gw.corp/gemini/v1", "https://gw.corp/gemini/v1/models"],
    ["https://gw.corp/gemini/v1beta/models", "https://gw.corp/gemini/v1beta/models"],
    ["https://gw.corp/gemini/v1/models", "https://gw.corp/gemini/v1/models"],
  ])("normalizes %s to the models collection %s", (input, expected) => {
    expect(resolveBaseUrl(input, "gemini", "translate")).toBe(expected);
  });

  it("trims surrounding whitespace from a pasted value", () => {
    expect(resolveBaseUrl("  https://gw.corp  ", "gemini", "translate")).toBe("https://gw.corp/v1beta/models");
  });

  it("strips trailing slashes so the appended model segment cannot double up", () => {
    expect(resolveBaseUrl("https://gw.corp/v1beta/models//", "gemini", "translate")).toBe(
      "https://gw.corp/v1beta/models",
    );
  });

  it("falls back to Google's endpoint when the preference is empty or blank", () => {
    const expected = "https://generativelanguage.googleapis.com/v1beta/models";
    expect(resolveBaseUrl("", "gemini", "translate")).toBe(expected);
    expect(resolveBaseUrl("   ", "gemini", "translate")).toBe(expected);
    expect(resolveBaseUrl(undefined, "gemini", "translate")).toBe(expected);
  });

  describe("plaintext http is limited to true loopback", () => {
    it.each([
      "http://localhost:4000",
      "http://127.0.0.1:8080",
      "http://[::1]",
      // The bind address a local proxy is usually started with; as a destination
      // the kernel keeps it on this host.
      "http://0.0.0.0:4000",
    ])("accepts %s", (url) => {
      expect(resolveBaseUrl(url, "gemini", "translate")).toBe(`${url}/v1beta/models`);
    });
  });

  it("tags the failure with the calling surface so the toast routes correctly", () => {
    try {
      resolveBaseUrl("http://gw.corp/v1beta/models", "gemini", "tts");
      throw new Error("expected rejection");
    } catch (err) {
      expect(isProviderError(err)).toBe(true);
      if (isProviderError(err)) expect(err.cause.surface).toBe("tts");
    }
  });
});

describe("resolveBaseUrl — anthropic, openai, openai-compatible", () => {
  it.each([
    ["anthropic", "https://api.anthropic.com/v1"],
    ["openai", "https://api.openai.com/v1"],
  ] as const)("falls back to the %s default with /v1 appended", (provider, expected) => {
    expect(resolveBaseUrl("", provider, "translate")).toBe(expected);
    expect(resolveBaseUrl(undefined, provider, "translate")).toBe(expected);
  });

  it("requires a server URL for openai-compatible, which has no default", () => {
    expectRejected("", "openai-compatible");
    expectRejected("   ", "openai-compatible");
    expectRejected(undefined, "openai-compatible");
  });

  it.each(["anthropic", "openai", "openai-compatible"] as const)("appends /v1 to a bare origin for %s", (provider) => {
    expect(resolveBaseUrl("http://localhost:8317", provider, "translate")).toBe("http://localhost:8317/v1");
    expect(resolveBaseUrl("https://gw.corp/", provider, "translate")).toBe("https://gw.corp/v1");
  });

  it.each([
    ["https://openrouter.ai/api/v1", "https://openrouter.ai/api/v1"],
    ["http://localhost:11434/v1/", "http://localhost:11434/v1"],
    [
      "https://generativelanguage.googleapis.com/v1beta/openai",
      "https://generativelanguage.googleapis.com/v1beta/openai",
    ],
    ["https://gw.corp/custom/prefix", "https://gw.corp/custom/prefix"],
  ])("uses a non-empty path as given: %s", (input, expected) => {
    expect(resolveBaseUrl(input, "openai-compatible", "translate")).toBe(expected);
  });
});

describe("resolveBaseUrl — security rules hold for every provider", () => {
  describe.each(PROVIDER_IDS)("%s", (provider) => {
    it("rejects http to a routable host, which would send the API key in cleartext", () => {
      expectRejected("http://gw.corp/v1", provider);
    });

    it("rejects a hostname that merely starts with localhost", () => {
      expectRejected("http://localhost.evil.com/v1", provider);
    });

    it("rejects private LAN addresses, which are not loopback", () => {
      expectRejected("http://192.168.1.50:4000/v1", provider);
      expectRejected("http://mac-mini.local:4000/v1", provider);
    });

    it("rejects a value that is not a URL", () => {
      expectRejected("gw.corp/v1", provider);
      expectRejected("not a url", provider);
    });

    it("rejects schemes other than http and https even though they parse", () => {
      expectRejected("javascript:alert(1)", provider);
      expectRejected("file:///etc/passwd", provider);
      expectRejected("ftp://gw.corp/v1", provider);
    });

    // `?…`/`#…` parse cleanly but swallow the appended resource path, so the
    // POST would silently land on the base path instead.
    it("rejects a query string or fragment", () => {
      expectRejected("https://gw.corp/v1?key=abc123", provider);
      expectRejected("https://gw.corp/v1?", provider);
      expectRejected("https://gw.corp/v1#section", provider);
    });

    it("rejects URL-embedded credentials before they can reach fetch", () => {
      expectRejected("https://user@gw.corp", provider);
      expectRejected("https://user:pass@gw.corp", provider);
      expectRejected("https://user:p%40ss@gw.corp", provider);
    });

    it("accepts plaintext http on loopback", () => {
      expect(() => resolveBaseUrl("http://127.0.0.1:8080", provider, "translate")).not.toThrow();
    });
  });
});

describe("customEndpointHost", () => {
  it.each(["gemini", "anthropic", "openai"] as const)(
    "returns nothing for the %s default so default installs keep the original error copy",
    (provider) => {
      expect(customEndpointHost(resolveBaseUrl("", provider, "translate"), provider)).toBeUndefined();
    },
  );

  it("treats another provider's default as custom", () => {
    expect(customEndpointHost(resolveBaseUrl("", "openai", "translate"), "anthropic")).toBe("api.openai.com");
  });

  it("always names the host for openai-compatible, which has no default", () => {
    expect(customEndpointHost("https://openrouter.ai/api/v1", "openai-compatible")).toBe("openrouter.ai");
  });

  it("returns host and port for a configured endpoint", () => {
    expect(customEndpointHost("https://gw.corp:8443/gemini/v1beta/models", "gemini")).toBe("gw.corp:8443");
  });

  it("never carries the path or userinfo into user-visible error copy", () => {
    expect(customEndpointHost("https://user:pass@gw.corp/k/SECRET123/v1beta/models", "gemini")).toBe("gw.corp");
  });

  it("treats a loopback endpoint as custom", () => {
    expect(customEndpointHost("http://localhost:4000/v1beta/models", "gemini")).toBe("localhost:4000");
  });
});

describe("hostForLog", () => {
  it("drops the path so a path-embedded credential cannot reach the log", () => {
    expect(hostForLog("https://gw.corp/k/SECRET123/v1beta/models")).toBe("gw.corp");
  });

  it("drops userinfo credentials", () => {
    expect(hostForLog("https://user:pass@gw.corp/v1beta/models")).toBe("gw.corp");
  });

  it("keeps the port, which distinguishes local proxies", () => {
    expect(hostForLog("http://localhost:4000/v1beta/models")).toBe("localhost:4000");
  });

  it("degrades to a placeholder rather than throwing inside a log call", () => {
    expect(hostForLog("not a url")).toBe("invalid");
  });
});
