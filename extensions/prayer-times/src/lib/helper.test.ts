import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({ environment: {} }));

import { locationAppNeedsBuild } from "./helper";

describe("locationAppNeedsBuild", () => {
  it("builds the location app when it is missing or a build stopped part way", () => {
    expect(locationAppNeedsBuild("", false)).toBe(true);
    expect(locationAppNeedsBuild("v1", false)).toBe(true);
  });

  it("keeps the app across reinstalls while its version is unchanged, so macOS doesn't ask again", () => {
    expect(locationAppNeedsBuild("v1", true)).toBe(false);
  });

  it("keeps an app built before versioning, which already has the user's permission", () => {
    expect(locationAppNeedsBuild("678160:1791782895418.914:1041", true)).toBe(false);
    expect(locationAppNeedsBuild("", true)).toBe(false);
  });

  it("rebuilds when the location app's version changes", () => {
    expect(locationAppNeedsBuild("v0", true)).toBe(true);
  });
});
