/**
 * The version a package would be upgraded TO, as rendered to the user.
 *
 * Fixtures below are captured from real `brew info --json=v2` output on
 * 2026-09-13. The case that motivated this file is `yt-dlp`: a REVISION bump,
 * where Homebrew rebuilds the same upstream version and records the difference
 * in a separate `revision` field rather than in `versions.stable`. Reading
 * `versions.stable` alone renders "2026.8.19 → 2026.8.19".
 */

import { describe, expect, it } from "vitest";
// `helpers.ts` calls `Array.prototype.first()`, installed as a side effect of
// `utils/array`. Importing helpers directly skips the barrel that pulls it in.
import "../array";
import { brewAvailableVersion, brewInstalledVersion, formatPackageVersion } from "./helpers";
import type { Cask, Formula } from "../types";

function formula(over: Partial<Formula>): Formula {
  return {
    name: "example",
    tap: "homebrew/core",
    homepage: "https://example.com",
    versions: { stable: "1.0.0", bottle: true },
    outdated: false,
    license: null,
    aliases: [],
    dependencies: [],
    build_dependencies: [],
    installed: [],
    keg_only: false,
    linked_keg: null,
    pinned: false,
    ...over,
  } as Formula;
}

describe("brewAvailableVersion", () => {
  // Captured: brew info --json=v2 yt-dlp → stable 2026.8.19, revision 1,
  // and `brew outdated --json=v2` calls that same build "2026.8.19_1".
  it("appends the revision, so a revision bump does not render X → X", () => {
    const ytDlp = formula({
      name: "yt-dlp",
      versions: { stable: "2026.8.19", bottle: true },
      revision: 1,
      outdated: true,
      installed: [{ version: "2026.8.19" }] as Formula["installed"],
    });
    expect(brewAvailableVersion(ytDlp)).toBe("2026.8.19_1");
  });

  it("leaves an unrevved formula alone", () => {
    // Captured: brew info --json=v2 ipatool → stable 2.5.0, revision 0.
    expect(brewAvailableVersion(formula({ versions: { stable: "2.5.0", bottle: true }, revision: 0 }))).toBe("2.5.0");
  });

  it("treats a missing revision as none — the search index strips the field", () => {
    // Verified against the on-disk chunk cache: formula chunks carry no
    // `revision` key at all, so undefined must mean "unrevved", not NaN.
    expect(brewAvailableVersion(formula({ versions: { stable: "3.15.0", bottle: true } }))).toBe("3.15.0");
  });

  it("never invents a revision suffix for a cask", () => {
    // Cask versions are opaque vendor strings; brew has no revision concept
    // for them, and `1.164.0,86805` must survive untouched.
    const arc = { token: "arc", version: "1.164.0,86805", installed: "1.161.1,85803" } as Cask;
    expect(brewAvailableVersion(arc)).toBe("1.164.0,86805");
  });

  it("returns undefined when there is no stable version to offer", () => {
    expect(brewAvailableVersion(formula({ versions: { stable: undefined, bottle: false } } as never))).toBe(undefined);
  });
});

describe("brewInstalledVersion", () => {
  // Captured from installedv2.json on a real machine: `installed` is ordered
  // oldest-first, so installed[0] names a keg the user is not running.
  it("names the LINKED keg, not the first one, when several are installed", () => {
    const pnpm = formula({
      name: "pnpm",
      installed: [{ version: "11.23.0" }, { version: "11.24.0" }] as Formula["installed"],
      linked_keg: "11.24.0",
    });
    expect(brewInstalledVersion(pnpm)).toBe("11.24.0");
  });

  it("falls back to the NEWEST keg when nothing is linked — a keg-only formula", () => {
    // `installed` is sorted ascending by version, and a keg-only formula reports
    // `linked_keg: null` even while opt-linked. Homebrew would read the OPT link
    // first, which this payload does not publish — the newest keg is the closest
    // approximation available, not a claim about what brew reads. This asserted
    // the FIRST keg until 2026-09-17, which disagreed with `effectiveKeg` — the
    // same row rendered one keg's version beside another keg's tags.
    const kegOnly = formula({
      installed: [{ version: "1.0.0" }, { version: "2.0.0" }] as Formula["installed"],
      linked_keg: null,
      keg_only: true,
    });
    expect(brewInstalledVersion(kegOnly)).toBe("2.0.0");
  });

  it("ignores a linked_keg that names no installed keg", () => {
    const stale = formula({
      installed: [{ version: "1.0.0" }] as Formula["installed"],
      linked_keg: "9.9.9",
    });
    expect(brewInstalledVersion(stale)).toBe("1.0.0");
  });

  it("returns undefined when nothing is installed", () => {
    expect(brewInstalledVersion(formula({ installed: [] }))).toBe(undefined);
  });
});

/**
 * The formatter is what actually reaches the screen. Asserting only on the
 * helper leaves its arrow branch and its not-installed fallback uncovered —
 * both changed in the same pass that added the helper.
 */
describe("formatPackageVersion", () => {
  it("renders the revision on the available side of the arrow", () => {
    const ytDlp = formula({
      name: "yt-dlp",
      versions: { stable: "2026.8.19", bottle: true },
      revision: 1,
      outdated: true,
      installed: [{ version: "2026.8.19" }] as Formula["installed"],
    });
    expect(formatPackageVersion(ytDlp)).toBe("2026.8.19 → 2026.8.19_1 (bottled, installed)");
  });

  it("shows the linked keg on the installed side, not the oldest one", () => {
    const pnpm = formula({
      name: "pnpm",
      versions: { stable: "11.25.0", bottle: true },
      outdated: true,
      installed: [{ version: "11.23.0" }, { version: "11.24.0" }] as Formula["installed"],
      linked_keg: "11.24.0",
    });
    expect(formatPackageVersion(pnpm)).toBe("11.24.0 → 11.25.0 (bottled, installed)");
  });

  it("shows a single version with no arrow when up to date", () => {
    const ipatool = formula({
      name: "ipatool",
      versions: { stable: "2.5.0", bottle: true },
      revision: 0,
      outdated: false,
      installed: [{ version: "2.5.0" }] as Formula["installed"],
    });
    expect(formatPackageVersion(ipatool)).toBe("2.5.0 (bottled, installed)");
  });

  it("falls back to the offered version when nothing is installed", () => {
    const notInstalled = formula({ versions: { stable: "1.0.0", bottle: true }, installed: [] });
    expect(formatPackageVersion(notInstalled)).toBe("1.0.0 (bottled)");
  });

  it("names ONE keg for both the version and the tags when nothing is linked", () => {
    // A keg-only formula reports `linked_keg: null` even while opt-linked, so
    // both readers fall back — and they used to fall back to opposite ends of
    // the list, rendering the OLDEST keg's version beside the NEWEST keg's
    // `installed_on_request` tag. What this pins is that ONE keg supplies both;
    // which keg is the approximation documented on `effectiveKeg`. Shape
    // captured from `readline` (keg_only, linked_keg null); the second keg is
    // synthetic, since this machine now carries only 8.3.3.
    const readline = formula({
      name: "readline",
      keg_only: true,
      linked_keg: null,
      versions: { stable: "8.3.6", bottle: true },
      outdated: false,
      installed: [
        { version: "8.3.3", installed_on_request: true },
        { version: "8.3.6", installed_on_request: false },
      ] as Formula["installed"],
    });
    // The newest keg is the one this picks, and it was NOT installed on
    // request — so "dependency" must sit beside 8.3.6, never beside 8.3.3.
    expect(brewInstalledVersion(readline)).toBe("8.3.6");
    expect(formatPackageVersion(readline)).toBe("8.3.6 (bottled, installed, dependency)");
  });
});
