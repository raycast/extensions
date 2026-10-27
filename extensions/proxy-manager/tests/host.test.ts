import { describe, expect, test } from "bun:test";
import {
  hostFromInput,
  isCoveredByPatterns,
  isWildcard,
  matchingPattern,
  normalizePattern,
  wildcardBase,
} from "../src/lib/host";

describe("normalizePattern", () => {
  test("lowercases, strips one numeric port and trailing dots", () => {
    expect(normalizePattern("API.Example.COM:8443.")).toEqual({
      ok: true,
      pattern: "api.example.com",
    });
  });

  test("accepts a single leading wildcard", () => {
    expect(normalizePattern("*.example.com")).toEqual({ ok: true, pattern: "*.example.com" });
  });

  test("rejects a bare wildcard and misplaced stars", () => {
    expect(normalizePattern("*").ok).toBe(false);
    expect(normalizePattern("api.*.example.com").ok).toBe(false);
    expect(normalizePattern("api.example.*").ok).toBe(false);
  });

  test("rejects whitespace, empty ports and single labels", () => {
    expect(normalizePattern("two words.com").ok).toBe(false);
    expect(normalizePattern("example.com:").ok).toBe(false);
    expect(normalizePattern("notahost").ok).toBe(false);
  });

  test("keeps IPv6 literals usable", () => {
    expect(normalizePattern("[::1]:8080")).toEqual({ ok: true, pattern: "::1" });
  });

  test("rejects characters the app would reject", () => {
    expect(normalizePattern("exa mple.com").ok).toBe(false);
    expect(normalizePattern("example.com/path").ok).toBe(false);
  });
});

describe("hostFromInput", () => {
  test("extracts the host from a pasted URL", () => {
    expect(hostFromInput("  https://API.Example.com:443/path?q=1#frag  ")).toBe("api.example.com");
  });

  test("tolerates clipboard punctuation and quotes", () => {
    expect(hostFromInput('"https://example.com/page",')).toBe("example.com");
    expect(hostFromInput("example.com.")).toBe("example.com");
  });

  test("keeps wildcard input a wildcard", () => {
    expect(hostFromInput("*.example.com")).toBe("*.example.com");
    expect(hostFromInput("https://*.example.com")).toBe("*.example.com");
  });

  test("rejects prose and empty input", () => {
    expect(hostFromInput("just some text")).toBeNull();
    expect(hostFromInput("")).toBeNull();
    expect(hostFromInput(undefined)).toBeNull();
  });
});

describe("wildcards", () => {
  test("isWildcard and wildcardBase", () => {
    expect(isWildcard("*.example.com")).toBe(true);
    expect(isWildcard("example.com")).toBe(false);
    expect(wildcardBase("*.example.com")).toBe("example.com");
  });

  test("a wildcard covers its base and every subdomain, not a lookalike", () => {
    const patterns = ["*.example.com", "api.other.dev"];
    expect(isCoveredByPatterns("example.com", patterns)).toBe(true);
    expect(isCoveredByPatterns("api.example.com", patterns)).toBe(true);
    expect(isCoveredByPatterns("deep.api.example.com", patterns)).toBe(true);
    expect(isCoveredByPatterns("api.other.dev", patterns)).toBe(true);
    expect(isCoveredByPatterns("example.com.evil.dev", patterns)).toBe(false);
    expect(isCoveredByPatterns("notexample.com", patterns)).toBe(false);
    expect(isCoveredByPatterns("example.org", patterns)).toBe(false);
  });

  test("an exact rule wins over a wildcard, and the winner is reported", () => {
    const patterns = ["*.example.com", "api.example.com"];
    expect(matchingPattern("api.example.com", patterns)).toBe("api.example.com");
    expect(matchingPattern("www.example.com", patterns)).toBe("*.example.com");
    expect(matchingPattern("example.org", patterns)).toBeNull();
  });
});
