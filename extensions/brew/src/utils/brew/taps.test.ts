/**
 * Tap parsing, against real `brew tap-info --json=v1 --installed` output
 * (Homebrew 7.0.6, trimmed to three taps).
 */

import { describe, expect, it } from "vitest";
import tapInfo from "../__fixtures__/tap-info.json";
import type { Cask, Formula } from "../types";
import { brewIdentifier, thirdPartyTapOf } from "./helpers";
import {
  individuallyTrusted,
  packageTrustState,
  parseTapInfo,
  parseTapName,
  tapCommandName,
  untapCommands,
} from "./taps";

describe("parseTapInfo", () => {
  it("keeps only taps that are actually tapped", () => {
    // `--installed` still reports homebrew/core with installed: false under the
    // API; listing it would offer to explore 8,000 formulae and untap nothing.
    expect(parseTapInfo(JSON.stringify(tapInfo)).map((t) => t.name)).toEqual([
      "cameroncooke/axe",
      "darrylmorley/whatcable",
    ]);
  });

  it("reads trust and what the tap provides", () => {
    const [axe, whatcable] = parseTapInfo(JSON.stringify(tapInfo));
    expect(axe).toMatchObject({ trusted: false, official: false, formula_names: ["cameroncooke/axe/axe"] });
    expect(whatcable.trusted).toBe(true);
    expect(whatcable.cask_tokens).toEqual(["darrylmorley/whatcable/whatcable"]);
  });

  it("leaves trust undefined when brew predates it", () => {
    const legacy = tapInfo.map((tap) => ({ ...tap, trusted: undefined }));
    expect(parseTapInfo(JSON.stringify(legacy))[0].trusted).toBeUndefined();
  });

  it("throws on output it cannot read", () => {
    expect(() => parseTapInfo("not json")).toThrow();
    expect(() => parseTapInfo("{}")).toThrow();
  });
});

describe("individuallyTrusted", () => {
  const [axe] = parseTapInfo(JSON.stringify(tapInfo));

  it("finds packages trusted one at a time in an untrusted tap", () => {
    // Real state: axe's tap is untrusted, its one formula is trusted — which is
    // what a fully-qualified install records on its own.
    expect(individuallyTrusted(axe, { taps: [], formulae: ["cameroncooke/axe/axe"], casks: [] })).toEqual([
      "cameroncooke/axe/axe",
    ]);
  });

  it("does not match a same-named package from another tap", () => {
    expect(individuallyTrusted(axe, { taps: [], formulae: ["someone/else/axe", "axe"], casks: [] })).toEqual([]);
  });
});

describe("parseTapName", () => {
  it.each([
    ["abue-ammar/tinycast", { tap: "abue-ammar/tinycast" }],
    ["  Abue-Ammar/TinyCast ", { tap: "abue-ammar/tinycast" }],
    ["abue-ammar/tinycast/tinycast", { tap: "abue-ammar/tinycast", package: "abue-ammar/tinycast/tinycast" }],
    ["abue-ammar/homebrew-tinycast", { tap: "abue-ammar/tinycast" }],
    // Pasted straight from an install page.
    ["brew trust --tap abue-ammar/tinycast", { tap: "abue-ammar/tinycast" }],
    // `--cask` is kept: a tap may ship a formula and a cask under one name, and
    // unflagged brew resolves that name to the formula.
    [
      "brew install --cask abue-ammar/tinycast/tinycast",
      { tap: "abue-ammar/tinycast", package: "abue-ammar/tinycast/tinycast", cask: true },
    ],
    ["brew install steipete/tap/birdclaw", { tap: "steipete/tap", package: "steipete/tap/birdclaw" }],
    ["https://github.com/abue-ammar/homebrew-tinycast", { tap: "abue-ammar/tinycast" }],
    ["github.com/abue-ammar/homebrew-tinycast.git/", { tap: "abue-ammar/tinycast" }],
    ["steipete/tap/birdclaw@2", { tap: "steipete/tap", package: "steipete/tap/birdclaw@2" }],
    // The two-argument form, for a repo not named homebrew-<repo>: brew clones
    // the URL given, not github.com/jundot/homebrew-omlx (which does not exist).
    [
      "brew tap jundot/omlx https://github.com/jundot/omlx",
      { tap: "jundot/omlx", url: "https://github.com/jundot/omlx" },
    ],
    ["https://github.com/jundot/omlx", { tap: "jundot/omlx", url: "https://github.com/jundot/omlx" }],
    ["github.com/jundot/omlx/", { tap: "jundot/omlx", url: "https://github.com/jundot/omlx" }],
    [
      "brew tap updatest/tap https://github.com/updatest/tap.git",
      { tap: "updatest/tap", url: "https://github.com/updatest/tap.git" },
    ],
    ["brew tap me/tools https://gitlab.com/me/tools.git", { tap: "me/tools", url: "https://gitlab.com/me/tools.git" }],
    // Other hosts nest repositories in groups, so their paths are not restricted.
    [
      "brew tap me/tools https://gitlab.com/group/sub/tools.git",
      { tap: "me/tools", url: "https://gitlab.com/group/sub/tools.git" },
    ],
    // A URL that names the default location adds nothing.
    ["brew tap a/b https://github.com/a/homebrew-b", { tap: "a/b" }],
  ])("reads %j", (input, expected) => {
    expect(parseTapName(input)).toEqual(expected);
  });

  it.each([
    "",
    "tinycast",
    "a/b/c/d",
    "a/b; rm -rf ~",
    "a/$(whoami)",
    "-rf/x",
    "a/ b",
    "https://gitlab.com/a/b",
    "homebrew/core",
    "Homebrew/cask",
    "brew tap a/b http://github.com/a/b",
    "brew tap a/b https://github.com/a/b;reboot",
    "brew tap a/b file:///etc",
    // A GitHub page is not a clone URL: only the repository root is.
    "brew tap a/b https://github.com/a/b/tree/main",
    "https://github.com/a/b/issues/1",
  ])("rejects %j", (input) => {
    expect(parseTapName(input)).toBeUndefined();
  });
});

describe("brewIdentifier", () => {
  const cask = (token: string, tap: string | null) => ({ token, tap }) as unknown as Cask;
  const formula = (name: string, tap: string | null) => ({ name, tap }) as unknown as Formula;

  it("qualifies a package from a third-party tap", () => {
    // Unqualified, brew resolves homebrew/core first, so a tapped package that
    // shares a name with a core one would install the wrong software.
    expect(brewIdentifier(cask("tinycast", "abue-ammar/tinycast"))).toBe("abue-ammar/tinycast/tinycast");
    expect(brewIdentifier(formula("axe", "cameroncooke/axe"))).toBe("cameroncooke/axe/axe");
  });

  it("leaves core, cask and tapless packages short", () => {
    expect(brewIdentifier(formula("wget", "homebrew/core"))).toBe("wget");
    expect(brewIdentifier(cask("firefox", "homebrew/cask"))).toBe("firefox");
    expect(brewIdentifier(formula("local", null))).toBe("local");
    expect(brewIdentifier({ name: "wget" })).toBe("wget");
  });

  it("does not qualify a name that already is", () => {
    // `brew outdated --json=v2` reports tapped formulae by full_name already.
    expect(brewIdentifier(formula("cameroncooke/axe/axe", "cameroncooke/axe"))).toBe("cameroncooke/axe/axe");
  });
});

describe("packageTrustState", () => {
  const [axe, whatcable] = parseTapInfo(JSON.stringify(tapInfo));
  const none = { taps: [], formulae: [], casks: [] };

  it("is trusted when the whole tap is", () => {
    expect(packageTrustState(whatcable, none, "darrylmorley/whatcable/whatcable", true)).toBe("trusted");
  });

  it("is trusted when the package is, in an untrusted tap", () => {
    const trust = { ...none, formulae: ["cameroncooke/axe/axe"] };
    expect(packageTrustState(axe, trust, "cameroncooke/axe/axe", false)).toBe("trusted");
  });

  it("checks the list for the package's kind", () => {
    // A trusted cask does not vouch for a formula of the same name.
    const trust = { ...none, casks: ["cameroncooke/axe/axe"] };
    expect(packageTrustState(axe, trust, "cameroncooke/axe/axe", false)).toBe("untrusted");
  });

  it("is untrusted for a tap that is not tapped yet", () => {
    expect(packageTrustState(undefined, none, "abue-ammar/tinycast/tinycast", true)).toBe("untrusted");
  });

  it("is unsupported when brew predates trust", () => {
    expect(packageTrustState({ ...axe, trusted: undefined }, none, "cameroncooke/axe/axe", false)).toBe("unsupported");
  });
});

describe("tapCommandName", () => {
  it.each([
    // The modern layout: cmd/<name>.rb, run as `brew <name>`.
    ["/opt/homebrew/Library/Taps/buo/homebrew-cask-upgrade/cmd/cu.rb", "brew cu"],
    // The older executable layout, named brew-<name>.
    ["/opt/homebrew/Library/Taps/beeftornado/homebrew-rmtree/cmd/brew-rmtree.rb", "brew rmtree"],
    ["/opt/homebrew/Library/Taps/x/homebrew-y/cmd/brew-hello", "brew hello"],
    ["/opt/homebrew/Library/Taps/x/homebrew-y/cmd/brew-sync.sh", "brew sync"],
  ])("names %s", (file, expected) => {
    expect(tapCommandName(file)).toBe(expected);
  });
});

describe("thirdPartyTapOf", () => {
  it("reads the tap field when there is one", () => {
    expect(thirdPartyTapOf({ token: "tinycast", tap: "abue-ammar/tinycast" } as unknown as Cask)).toBe(
      "abue-ammar/tinycast",
    );
    expect(thirdPartyTapOf({ token: "firefox", tap: "homebrew/cask" } as unknown as Cask)).toBeUndefined();
  });

  it("reads a qualified name when there is no tap field", () => {
    // `brew outdated --json=v2` reports a tapped formula this way, with no `tap`.
    expect(thirdPartyTapOf({ name: "steipete/tap/birdclaw" })).toBe("steipete/tap");
    expect(thirdPartyTapOf({ name: "wget" })).toBeUndefined();
  });
});

describe("untapCommands", () => {
  // `brew untap --force` only uninstalls first from Homebrew 6.0.13; before
  // that it untaps and leaves the packages behind. Spelled out, the steps do
  // what the confirmation says on every supported version.
  it("uninstalls casks, then formulae, then untaps", () => {
    expect(
      untapCommands("steipete/tap", { formulae: ["steipete/tap/birdclaw"], casks: ["steipete/tap/codexbar"] }),
    ).toEqual([
      "HOMEBREW_NO_AUTOREMOVE=1 brew uninstall --cask steipete/tap/codexbar",
      "HOMEBREW_NO_AUTOREMOVE=1 brew uninstall --formula steipete/tap/birdclaw",
      "brew untap steipete/tap",
    ]);
  });

  it("names every package of a kind in one uninstall", () => {
    expect(untapCommands("a/b", { formulae: ["a/b/one", "a/b/two"], casks: [] })).toEqual([
      "HOMEBREW_NO_AUTOREMOVE=1 brew uninstall --formula a/b/one a/b/two",
      "brew untap a/b",
    ]);
  });

  it("is a plain untap when nothing is installed", () => {
    expect(untapCommands("a/b", { formulae: [], casks: [] })).toEqual(["brew untap a/b"]);
  });

  // Uninstalling the casks would otherwise autoremove the tap's own formulae
  // that were installed only as their dependencies, and the explicit formula
  // uninstall would then fail on a package that is gone, keeping the tap.
  it("turns autoremove off for every uninstall", () => {
    const commands = untapCommands("a/b", { formulae: ["a/b/one"], casks: ["a/b/two"] });
    expect(commands.filter((c) => c.includes(" uninstall "))).toHaveLength(2);
    for (const c of commands.filter((c) => c.includes(" uninstall "))) {
      expect(c.startsWith("HOMEBREW_NO_AUTOREMOVE=1 ")).toBe(true);
    }
  });

  it("never passes --force", () => {
    const commands = untapCommands("a/b", { formulae: ["a/b/one"], casks: ["a/b/two"] });
    expect(commands.join(" ")).not.toContain("--force");
  });
});
