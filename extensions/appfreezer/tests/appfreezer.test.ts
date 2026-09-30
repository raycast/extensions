import { describe, expect, it } from "vitest";
import { buildActionURL, locateAppFreezerPath } from "../src/bridge-helpers";

describe("locateAppFreezerPath", () => {
  it("uses the bundle identifier instead of an assumed install path", () => {
    const path = locateAppFreezerPath([
      { bundleId: "com.example.Other", path: "/Applications/Other.app" },
      { bundleId: "com.chxsong.AppFreezer", path: "/Users/me/Applications/AppFreezer.app" },
    ]);
    expect(path).toBe("/Users/me/Applications/AppFreezer.app");
  });
});

describe("buildActionURL", () => {
  it("encodes opaque identifiers and request IDs", () => {
    const url = new URL(buildActionURL("pause", "request id", "pid/start+uid"));
    expect(url.protocol).toBe("appfreezer:");
    expect(url.hostname).toBe("pause");
    expect(url.searchParams.get("requestID")).toBe("request id");
    expect(url.searchParams.get("id")).toBe("pid/start+uid");
  });

  it("builds the protocol v4 Force Quit URL", () => {
    const url = new URL(buildActionURL("force-quit", "request-3", "opaque-id"));
    expect(url.hostname).toBe("force-quit");
    expect(url.searchParams.get("requestID")).toBe("request-3");
    expect(url.searchParams.get("id")).toBe("opaque-id");
  });
});
