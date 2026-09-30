/**
 * Tests for the pure selection logic behind the selective upgrade review.
 *
 * Fixtures below reproduce real `brew outdated --json=v2` payloads captured
 * from Homebrew 6.x (2026-07-30) — not the type declarations. In particular:
 * `installed_versions` is an array for casks as well as formulae, and
 * `pinned` / `pinned_version` are reported for both. Casks have been pinnable
 * since Homebrew 5.1.12.
 */

import { describe, expect, it } from "vitest";
import {
  brewName,
  brewUninstallCommand,
  brewUpgradeCommand,
  isCask,
  normalizeOutdatedResults,
  pinLookupKey,
} from "./brew/helpers";
import { preferences } from "./preferences";
import { isPinnedRefusal, upgradeSkipReason } from "./errors";
import {
  applyPinChange,
  applyPinOverrides,
  confirmedPinOverrides,
  defaultSelectionState,
  mergeSelectionState,
  restrictToSelection,
  selectedKeys,
  selectedPackages,
  selectionKey,
  setAllSelection,
  toggleSelection,
  SelectablePackage,
} from "./upgrade-selection";
import type { OutdatedResults } from "./types";

/// Fixtures — captured from real `brew outdated --json=v2` output.

const OUTDATED_JSON = `{
  "formulae": [
    {
      "name": "zen",
      "installed_versions": ["1.21.9b"],
      "current_version": "1.21.10b",
      "pinned": false,
      "pinned_version": null
    },
    {
      "name": "node",
      "installed_versions": ["24.1.0"],
      "current_version": "24.2.0",
      "pinned": true,
      "pinned_version": "24.1.0"
    },
    {
      "name": "ripgrep",
      "installed_versions": ["14.1.0"],
      "current_version": "14.1.1",
      "pinned": false,
      "pinned_version": null
    }
  ],
  "casks": [
    {
      "name": "raycast",
      "installed_versions": ["1.99.0"],
      "current_version": "1.100.0",
      "pinned": false,
      "pinned_version": null
    },
    {
      "name": "docker",
      "installed_versions": ["4.30.0"],
      "current_version": "4.31.0",
      "pinned": true,
      "pinned_version": "4.30.0"
    }
  ]
}`;

const outdated = JSON.parse(OUTDATED_JSON) as OutdatedResults;

function toSelectable(): SelectablePackage[] {
  return outdated.formulae.map((f) => ({ kind: "formula", name: f.name, pinned: f.pinned }));
}

/** Build n unpinned formula-shaped packages for volume scenarios. */
function makeFormulae(count: number): SelectablePackage[] {
  return Array.from({ length: count }, (_, i) => ({
    kind: "formula" as const,
    name: `pkg-${i}`,
    pinned: false,
  }));
}

/// Selection identity

describe("selectionKey", () => {
  it("is a composite of kind and name", () => {
    expect(selectionKey("formula", "zen")).toBe("formula:zen");
    expect(selectionKey("cask", "zen")).toBe("cask:zen");
  });

  it("never conflates a formula and a cask sharing a name", () => {
    expect(selectionKey("formula", "zen")).not.toBe(selectionKey("cask", "zen"));
  });
});

/// Default selection

describe("defaultSelectionState", () => {
  it("selects everything not currently pinned — what a plain brew upgrade would do", () => {
    const state = defaultSelectionState(toSelectable());
    expect(state.get(selectionKey("formula", "zen"))).toBe(true);
    expect(state.get(selectionKey("formula", "ripgrep"))).toBe(true);
    expect(state.get(selectionKey("formula", "node"))).toBe(false);
  });

  it("treats unknown pin state as unpinned, matching plain brew upgrade", () => {
    const state = defaultSelectionState([{ kind: "formula", name: "mystery" }]);
    expect(state.get(selectionKey("formula", "mystery"))).toBe(true);
  });
});

/// Merge across refresh

describe("mergeSelectionState", () => {
  it("preserves the user's choices when the outdated list is refreshed", () => {
    const packages = toSelectable();
    let state = defaultSelectionState(packages);
    state = toggleSelection(state, selectionKey("formula", "zen")); // user deselects zen

    const merged = mergeSelectionState(state, packages);
    expect(merged.get(selectionKey("formula", "zen"))).toBe(false);
    expect(merged.get(selectionKey("formula", "ripgrep"))).toBe(true);
  });

  it("deselects a package found pinned on refresh — a pin applied outside the review wins over a stale selection", () => {
    const packages = toSelectable();
    const state = defaultSelectionState(packages); // zen selected
    const zenNowPinned = packages.map((p) => (p.name === "zen" ? { ...p, pinned: true } : p));
    const merged = mergeSelectionState(state, zenNowPinned);
    expect(merged.get(selectionKey("formula", "zen"))).toBe(false);
  });

  it("applies the default to packages that are new since the last fetch", () => {
    const state = defaultSelectionState(toSelectable());
    const withNew = [...toSelectable(), { kind: "formula" as const, name: "jq", pinned: false }];
    const merged = mergeSelectionState(state, withNew);
    expect(merged.get(selectionKey("formula", "jq"))).toBe(true);
  });

  it("unpinned casks are default-selected like unpinned formulae", () => {
    const packages: SelectablePackage[] = [
      { kind: "formula", name: "wget", pinned: false },
      { kind: "cask", name: "firefox", pinned: false },
    ];
    const merged = mergeSelectionState(new Map(), packages);
    expect(merged.get(selectionKey("cask", "firefox"))).toBe(true);
    expect(selectedPackages(packages, merged)).toEqual(packages);
  });

  it("excludes a pinned cask, exactly as it excludes a pinned formula", () => {
    const packages: SelectablePackage[] = [
      { kind: "cask", name: "raycast", pinned: false },
      { kind: "cask", name: "docker", pinned: true },
    ];
    const merged = mergeSelectionState(new Map(), packages);
    expect(merged.get(selectionKey("cask", "raycast"))).toBe(true);
    expect(merged.get(selectionKey("cask", "docker"))).toBe(false);
    expect(selectedPackages(packages, merged)).toEqual([{ kind: "cask", name: "raycast", pinned: false }]);
  });

  it("unpinning a cask in the review includes it, like a formula", () => {
    const packages: SelectablePackage[] = [{ kind: "cask", name: "docker", pinned: true }];
    const state = mergeSelectionState(new Map(), packages);
    const key = selectionKey("cask", "docker");
    expect(state.get(key)).toBe(false);
    expect(applyPinChange(state, key, false).get(key)).toBe(true);
  });

  it("drops packages that are no longer outdated", () => {
    const state = defaultSelectionState(toSelectable());
    const merged = mergeSelectionState(state, [{ kind: "formula", name: "zen", pinned: false }]);
    expect(merged.size).toBe(1);
    expect(merged.has(selectionKey("formula", "ripgrep"))).toBe(false);
  });
});

/// Toggling and bulk selection

describe("toggleSelection / setAllSelection / selectedKeys", () => {
  it("toggles a single package without mutating the previous state", () => {
    const state = defaultSelectionState(toSelectable());
    const key = selectionKey("formula", "zen");
    const next = toggleSelection(state, key);
    expect(next.get(key)).toBe(false);
    expect(state.get(key)).toBe(true);
  });

  it("ignores unknown keys", () => {
    const state = defaultSelectionState(toSelectable());
    const next = toggleSelection(state, selectionKey("formula", "not-outdated"));
    expect(next.has(selectionKey("formula", "not-outdated"))).toBe(false);
  });

  it("selects and deselects everything upgradable — production always passes the pinned set as locked", () => {
    const state = defaultSelectionState(toSelectable());
    // Match the production call shape: Select All never unlocks pinned
    // formulae ("node" is pinned in the fixture).
    const locked = new Set([selectionKey("formula", "node")]);
    const all = setAllSelection(state, true, locked);
    expect(selectedKeys(all).size).toBe(2);
    expect(all.get(selectionKey("formula", "node"))).toBe(false);
    expect(selectedKeys(setAllSelection(state, false, locked)).size).toBe(0);
  });

  it("never selects a locked (pinned) package via Select All", () => {
    const state = defaultSelectionState(toSelectable());
    const locked = new Set([selectionKey("formula", "node")]);
    const all = setAllSelection(state, true, locked);
    expect(all.get(selectionKey("formula", "node"))).toBe(false);
    expect(selectedKeys(all).size).toBe(2);
  });
});

/// Pin changes

describe("applyPinChange", () => {
  it("deselects a package that was pinned and selects one that was unpinned", () => {
    const state = defaultSelectionState(toSelectable());
    const key = selectionKey("formula", "zen");
    const pinned = applyPinChange(state, key, true);
    expect(pinned.get(key)).toBe(false);
    const unpinned = applyPinChange(pinned, key, false);
    expect(unpinned.get(key)).toBe(true);
    expect(state.get(key)).toBe(true);
  });

  it("ignores unknown keys", () => {
    const state = defaultSelectionState(toSelectable());
    const key = selectionKey("cask", "zen");
    expect(applyPinChange(state, key, true).has(key)).toBe(false);
  });
});

describe("pin overrides", () => {
  const key = (name: string) => selectionKey("formula", name);

  it("a local unpin beats a stale snapshot that still reports the package pinned", () => {
    // The reported bug: unpin A (refresh in flight), unpin B and select it,
    // then A's stale snapshot lands still claiming B pinned — without the
    // override the merge force-deselects B and the later accurate refresh
    // keeps that loss.
    const stale: SelectablePackage[] = [
      { kind: "formula", name: "allure", pinned: false },
      { kind: "formula", name: "oxfmt", pinned: true },
    ];
    const overrides = new Map([[key("oxfmt"), false]]);
    const selection = new Map([
      [key("allure"), true],
      [key("oxfmt"), true],
    ]);
    const merged = mergeSelectionState(selection, applyPinOverrides(stale, overrides));
    expect(merged.get(key("oxfmt"))).toBe(true);
  });

  it("a local pin beats a stale snapshot that still reports the package unpinned", () => {
    const stale: SelectablePackage[] = [{ kind: "formula", name: "node", pinned: false }];
    const overrides = new Map([[key("node"), true]]);
    const merged = mergeSelectionState(new Map([[key("node"), true]]), applyPinOverrides(stale, overrides));
    expect(merged.get(key("node"))).toBe(false);
  });

  it("leaves packages without an override untouched and copies the list", () => {
    const packages: SelectablePackage[] = [
      { kind: "formula", name: "a", pinned: true },
      { kind: "formula", name: "b", pinned: false },
    ];
    const overlaid = applyPinOverrides(packages, new Map([[key("b"), true]]));
    expect(overlaid[0]).toBe(packages[0]);
    expect(overlaid[1]).toEqual({ kind: "formula", name: "b", pinned: true });
    expect(applyPinOverrides(packages, new Map())).toEqual(packages);
  });

  it("retires an override when the fetched pin state agrees, keeps it while stale", () => {
    const packages: SelectablePackage[] = [
      { kind: "formula", name: "caught-up", pinned: false },
      { kind: "formula", name: "still-stale", pinned: true },
    ];
    const overrides = new Map([
      [key("caught-up"), false],
      [key("still-stale"), false],
    ]);
    expect(confirmedPinOverrides(packages, overrides)).toEqual([key("caught-up")]);
  });

  it("retires an override whose package left the outdated list — it must not ambush a later re-appearance", () => {
    const packages: SelectablePackage[] = [{ kind: "formula", name: "present", pinned: true }];
    const overrides = new Map([
      [key("present"), false],
      [key("gone"), false],
    ]);
    expect(confirmedPinOverrides(packages, overrides)).toEqual([key("gone")]);
  });
});

/// Run-list derivation

describe("selectedPackages", () => {
  it("includes exactly the selected packages: 30 outdated, 12 selected → those 12 and no others", () => {
    const packages = makeFormulae(30);
    let state = defaultSelectionState(packages);
    for (let i = 12; i < 30; i++) {
      state = toggleSelection(state, selectionKey("formula", `pkg-${i}`));
    }
    const run = selectedPackages(packages, state);
    expect(run).toHaveLength(12);
    const names = new Set(run.map((p) => p.name));
    for (let i = 0; i < 12; i++) {
      expect(names.has(`pkg-${i}`)).toBe(true);
    }
  });

  it("excludes a pinned package under the default selection — the run never touches pins", () => {
    const packages = toSelectable();
    const run = selectedPackages(packages, defaultSelectionState(packages));
    expect(run.map((p) => p.name)).toEqual(["zen", "ripgrep"]);
  });

  it("treats a package missing from the selection state as deselected — an incomplete state fails toward holding back, never toward upgrading", () => {
    const packages = makeFormulae(2);
    const state = new Map([[selectionKey("formula", "pkg-0"), true]]); // pkg-1 absent
    expect(selectedPackages(packages, state).map((p) => p.name)).toEqual(["pkg-0"]);
  });

  it("keeps a formula and a cask with the same name independent", () => {
    const packages: SelectablePackage[] = [
      { kind: "formula", name: "zen", pinned: false },
      { kind: "cask", name: "zen", pinned: false },
    ];
    let state = defaultSelectionState(packages);
    state = toggleSelection(state, selectionKey("cask", "zen"));
    expect(selectedPackages(packages, state)).toEqual([{ kind: "formula", name: "zen", pinned: false }]);
  });
});

/// Run enforcement

describe("restrictToSelection", () => {
  it("keeps exactly the intersection of the run's outdated list and the selection", () => {
    const resolved = [
      { name: "ffmpeg", isCask: false },
      { name: "git", isCask: false },
      { name: "zen", isCask: true },
    ];
    const selection = [
      { name: "git", isCask: false },
      { name: "zen", isCask: true },
      // Selected at review time, no longer outdated after the run's update
      { name: "wget", isCask: false },
    ];
    expect(restrictToSelection(resolved, selection)).toEqual([
      { name: "git", isCask: false },
      { name: "zen", isCask: true },
    ]);
  });

  it("never upgrades a package that became outdated during the run's own update — it was not reviewed", () => {
    const resolved = [
      { name: "git", isCask: false },
      { name: "openssl", isCask: false }, // newly outdated, absent from the review
    ];
    const selection = [{ name: "git", isCask: false }];
    expect(restrictToSelection(resolved, selection)).toEqual([{ name: "git", isCask: false }]);
  });

  it("keeps a formula and a cask sharing a name independent", () => {
    const resolved = [
      { name: "zen", isCask: false },
      { name: "zen", isCask: true },
    ];
    const selection = [{ name: "zen", isCask: true }];
    expect(restrictToSelection(resolved, selection)).toEqual([{ name: "zen", isCask: true }]);
  });

  it("an empty selection holds everything back", () => {
    const resolved = [{ name: "git", isCask: false }];
    expect(restrictToSelection(resolved, [])).toEqual([]);
  });
});

/// Data contract

describe("outdated payload contract", () => {
  it("installed_versions is an array for casks as well as formulae", () => {
    expect(Array.isArray(outdated.formulae[0].installed_versions)).toBe(true);
    expect(Array.isArray(outdated.casks[0].installed_versions)).toBe(true);
    expect(outdated.casks[0].installed_versions[0]).toBe("1.99.0");
  });
});

/**
 * `brew outdated --json=v2` omits `token` from casks, but `isCask()` — and so
 * every brew argv built from `brewCaskOption` / `brewIdentifier` — keys off it.
 * Several formula-vs-cask conflations in this work passed a clean typecheck
 * before normalization existed, so pin the discriminator down here.
 */
describe("outdated casks are distinguishable from formulae", () => {
  // Parsed exactly as the production ingresses parse it: raw brew JSON, then
  // normalized. Stamping the token by hand here would test the contract while
  // leaving the ingress — the thing that actually broke — uncovered.
  const parsed = normalizeOutdatedResults(JSON.parse(OUTDATED_JSON) as OutdatedResults);
  const outdatedCask = parsed.casks[0];
  const outdatedFormula = parsed.formulae[0];

  it("synthesises a token brew does not report", () => {
    // Guards the ingress: raw brew JSON has no token at all.
    const raw = JSON.parse(OUTDATED_JSON) as OutdatedResults;
    expect(raw.casks[0].token).toBeUndefined();
    expect(outdatedCask.token).toBe(outdatedCask.name);
  });

  it("leaves an already-normalized payload alone", () => {
    const again = normalizeOutdatedResults(parsed);
    expect(again.casks[0].token).toBe(outdatedCask.name);
  });

  it("identifies an outdated cask as a cask", () => {
    expect(isCask(outdatedCask)).toBe(true);
    expect(isCask(outdatedFormula)).toBe(false);
  });

  it("builds cask-shaped upgrade and uninstall commands", () => {
    expect(brewUpgradeCommand(outdatedCask)).toContain("--cask");
    expect(brewUpgradeCommand(outdatedCask)).toContain(outdatedCask.name);
    expect(brewUninstallCommand(outdatedCask)).toContain("--cask");
  });

  it("leaves formula commands without --cask", () => {
    expect(brewUpgradeCommand(outdatedFormula)).not.toContain("--cask");
  });

  it("renders the whole name, not its first character", () => {
    // An OutdatedCask's `name` is a string where a Cask's is an array; indexing
    // blindly turns "raycast" into "r".
    expect(brewName(outdatedCask)).toBe(outdatedCask.name);
  });
});

/**
 * The `@raycast/api` stub must hand back the DECLARED preference defaults. With
 * an empty object every preference reads `undefined`, so a test can pass by
 * exercising a falsy branch that no real user is ever in.
 */
describe("test preferences mirror the declared defaults", () => {
  it("gives zapCask its declared default rather than undefined", () => {
    // zapCask defaults to false, but it must be a real boolean, not absent.
    expect(typeof preferences.zapCask).toBe("boolean");
  });

  it("gives pinnedFirst its declared default of true", () => {
    expect(preferences.pinnedFirst).toBe(true);
  });
});

/**
 * Homebrew's own refusals, quoted from the installed source. The extension reads
 * pin state from disk before naming a package, so these are the backstop for a
 * pin that lands between that check and the command.
 */
describe("pinned refusal detection", () => {
  it("matches the named-upgrade refusal", () => {
    // cmd/upgrade.rb: "Not upgrading #{pinned.count} pinned #{pluralize("package", …)}:"
    expect(isPinnedRefusal(new Error("Error: Not upgrading 1 pinned package:"))).toBe(true);
    expect(isPinnedRefusal(new Error("Error: Not upgrading 3 pinned packages:"))).toBe(true);
  });

  it("matches the uninstall refusal for either kind", () => {
    // uninstall.rb and cask/uninstall.rb, verbatim
    expect(isPinnedRefusal(new Error("asc is pinned. You must unpin it to uninstall."))).toBe(true);
    expect(isPinnedRefusal(new Error("1password is pinned. You must unpin it to uninstall."))).toBe(true);
  });

  it("does not match brew's OTHER 'Not upgrading' refusals", () => {
    // A different problem with a different remedy — offering "unpin and force"
    // here would be nonsense.
    expect(isPinnedRefusal(new Error("Not upgrading zoom, it is deprecated because it is discontinued"))).toBe(false);
    expect(isPinnedRefusal(new Error("Not upgrading warp, no version is available for the current platform"))).toBe(
      false,
    );
  });

  it("does not match unrelated failures", () => {
    expect(isPinnedRefusal(new Error("Error: Another active Homebrew process is already running"))).toBe(false);
    expect(isPinnedRefusal(undefined)).toBe(false);
  });
});

/**
 * Homebrew warns and skips rather than failing for these, exiting 0 — so the run
 * would otherwise report an upgrade that never happened. The message shapes are
 * taken from the installed source; the unrecognised-reason case below is a
 * deliberate synthetic fixture.
 */
describe("declined upgrades are read from brew's warnings", () => {
  it("keeps each cask reason distinct rather than collapsing them", () => {
    // cask/upgrade.rb, verbatim shapes
    expect(upgradeSkipReason("Warning: Not upgrading zoom, it is disabled because it is discontinued!", "zoom")).toBe(
      "Disabled by Homebrew",
    );
    expect(
      upgradeSkipReason("Warning: Not upgrading warp, no version is available for the current platform", "warp"),
    ).toBe("No version for this platform");
    expect(upgradeSkipReason("Warning: Not upgrading zed, the downloaded artifact has not changed", "zed")).toBe(
      "Already up to date",
    );
    expect(upgradeSkipReason("Warning: Not upgrading zed, the latest version is already installed", "zed")).toBe(
      "Already up to date",
    );
  });

  it("reads the minimum-version skip, which both kinds emit", () => {
    // cmd/upgrade.rb for formulae and casks alike. "not below" includes equal,
    // so the wording must not claim the installed one is strictly newer.
    expect(
      upgradeSkipReason(
        "Warning: Not upgrading docker, the installed version is not below the minimum version 4.0",
        "docker",
      ),
    ).toBe("Installed version is not older");
  });

  it("reads the formula already-installed skip, which has no 'Not upgrading' prefix", () => {
    // cmd/upgrade.rb: opoo "#{f.full_specified_name} #{latest_keg.version} already installed"
    // Reached whenever an earlier package in the same run upgraded this one as a dependency.
    expect(upgradeSkipReason("Warning: aom 3.15.0 already installed", "aom")).toBe("Already up to date");
  });

  it("reads the cask cannot-be-upgraded-as-is skip", () => {
    // cask/upgrade.rb
    expect(upgradeSkipReason("Warning: The cask 'docker' cannot be upgraded as-is. To fix this, run:", "docker")).toBe(
      "Cannot be upgraded as-is — reinstall it",
    );
  });

  it("does NOT treat deprecation as a skip", () => {
    // brew warns about a deprecated package and upgrades it anyway
    // (formula_installer.rb, cask/installer.rb). Calling that a skip would
    // report a real upgrade as declined.
    expect(upgradeSkipReason("Warning: zoom has been deprecated because it is discontinued", "zoom")).toBeUndefined();
  });

  it("carries an unrecognised reason through rather than claiming an upgrade", () => {
    expect(upgradeSkipReason("Warning: Not upgrading fd, some future reason.", "fd")).toBe("some future reason");
  });

  it("matches a tap-qualified warning against the short name", () => {
    // Homebrew names the package with `full_specified_name`, which carries the
    // tap outside homebrew/core — but `brew info --json=v2 --installed` gives
    // the short name, so the single-package path passes the short form.
    expect(upgradeSkipReason("Warning: steipete/tap/birdclaw 1.0.2 already installed", "birdclaw")).toBe(
      "Already up to date",
    );
    expect(
      upgradeSkipReason(
        "Warning: Not upgrading cameroncooke/axe/axe, no version is available for the current platform",
        "axe",
      ),
    ).toBe("No version for this platform");
    // Homebrew rejects extra slashes in a tap name but not punctuation
    // (tap_constants.rb), so the segments cannot be a \w-only class.
    expect(upgradeSkipReason("Warning: acme/tools!/widget 1.0 already installed", "widget")).toBe("Already up to date");
    // …and against the qualified name, which `brew outdated --json=v2` returns.
    expect(upgradeSkipReason("Warning: steipete/tap/birdclaw 1.0.2 already installed", "steipete/tap/birdclaw")).toBe(
      "Already up to date",
    );
  });

  it("does not attribute another package's warning to this one", () => {
    expect(upgradeSkipReason("Warning: Not upgrading zoom, it is disabled because x", "zed")).toBeUndefined();
    // A versioned sibling is a DIFFERENT package: `python` must not absorb
    // `python@3.14`'s warning.
    expect(
      upgradeSkipReason(
        "Warning: Not upgrading python@3.14, no version is available for the current platform",
        "python",
      ),
    ).toBeUndefined();
    expect(upgradeSkipReason("Warning: python@3.14 3.14.0 already installed", "python")).toBeUndefined();
    // A tap prefix must not let one package absorb another's warning either.
    expect(upgradeSkipReason("Warning: steipete/tap/birdclaw 1.0 already installed", "claw")).toBeUndefined();
  });

  it("returns nothing for a clean upgrade", () => {
    expect(upgradeSkipReason("==> Upgrading zed\n==> Downloading...", "zed")).toBeUndefined();
  });

  it("handles a versioned name without treating @ as a pattern", () => {
    expect(
      upgradeSkipReason(
        "Warning: Not upgrading warp@preview, no version is available for the current platform",
        "warp@preview",
      ),
    ).toBe("No version for this platform");
  });
});

/**
 * Homebrew pins a formula at HOMEBREW_PINNED_KEGS/<formula.name> — the SHORT
 * name (formula_pin.rb) — but `brew outdated --json=v2` reports a tapped
 * formula by its qualified `full_name`. Looking a pin up by the qualified name
 * misses it entirely, and the package is then handed to a named `brew upgrade`
 * that Homebrew refuses.
 */
describe("pin lookup key", () => {
  it("reduces a tap-qualified formula to the name its pin is stored under", () => {
    expect(pinLookupKey("steipete/tap/birdclaw")).toBe("birdclaw");
    expect(pinLookupKey("cameroncooke/axe/axe")).toBe("axe");
  });

  it("leaves an unqualified name alone", () => {
    expect(pinLookupKey("brotli")).toBe("brotli");
    expect(pinLookupKey("python@3.14")).toBe("python@3.14");
    expect(pinLookupKey("1password")).toBe("1password");
  });
});
