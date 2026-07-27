import { describe, expect, it } from "vitest";
import { compareVersions } from "./updates";

describe("compareVersions", () => {
  it("reports current when installed matches upstream", () => {
    expect(compareVersions("1.1.298", "1.1.298")).toEqual({
      installed: "1.1.298",
      latest: "1.1.298",
      outdated: false,
    });
  });

  it("reports outdated when upstream has moved", () => {
    // The realistic case: upstream published 357 versions in ~15 months, so a
    // local snapshot drifts within days.
    expect(compareVersions("1.1.200", "1.1.298").outdated).toBe(true);
  });

  it("never claims outdated when the check failed", () => {
    // Offline, rate-limited, DNS-blocked all arrive here as null. Showing an
    // update prompt on a failed lookup would be worse than showing nothing.
    expect(compareVersions("1.1.298", null)).toEqual({
      installed: "1.1.298",
      latest: null,
      outdated: false,
    });
  });

  it("treats any difference as outdated, including a lower upstream", () => {
    // Deliberate: the local data is a snapshot copied from the registry, so
    // "newer than latest" means the snapshot no longer matches what ships —
    // which is the thing worth surfacing, whichever direction it went.
    expect(compareVersions("1.2.0", "1.1.298").outdated).toBe(true);
  });
});
