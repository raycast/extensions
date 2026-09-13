import { describe, expect, it } from "vitest";

import { resolveAuthMode } from "./preferences";

describe("resolveAuthMode", () => {
  it("defaults to OAuth and honors the API-token selection", () => {
    expect(resolveAuthMode(undefined)).toBe("oauth");
    expect(resolveAuthMode("oauth")).toBe("oauth");
    expect(resolveAuthMode("apiToken")).toBe("apiToken");
  });

  it("falls back to OAuth for values the preference dropdown cannot produce", () => {
    expect(resolveAuthMode("legacy")).toBe("oauth");
    expect(resolveAuthMode("")).toBe("oauth");
    expect(resolveAuthMode("keychain")).toBe("oauth");
  });
});
