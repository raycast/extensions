import { describe, expect, it } from "vitest";
import { buildAuthHeader } from "../lib/client-config";

describe("buildAuthHeader", () => {
  it("creates a basic auth header", () => {
    expect(buildAuthHeader("user", "pass")).toBe("Basic dXNlcjpwYXNz");
  });

  it("returns undefined when credentials are incomplete", () => {
    expect(buildAuthHeader("user", undefined)).toBeUndefined();
  });
});
