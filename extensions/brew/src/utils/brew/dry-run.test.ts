import { describe, expect, it, vi } from "vitest";
import { formatBrewSize, parseDryRun, parseUpgradeDryRun } from "./dry-run";
import type { ExecError, ExecResult } from "../types";

/** What the stubbed `execBrew` does for the next `brewUpgradeDryRun` call. */
const brewRun = vi.hoisted(() => ({
  outcome: (): ExecResult => ({ stdout: "", stderr: "" }),
}));

vi.mock("./commands", () => ({
  execBrew: async () => brewRun.outcome(),
  execBrewJson: async () => brewRun.outcome(),
}));

const { brewUpgradeDryRun } = await import("./actions");

/** An `execBrew` rejection, shaped the way `commands.ts` shapes one. */
function execFailure(code: number, stdout: string, stderr: string): ExecError {
  return Object.assign(new Error(`Command failed with exit code ${code}`), { code, stdout, stderr });
}

/**
 * Every fixture below is REAL `brew install --dry-run --no-ask …` stdout,
 * captured verbatim on 2026-09-14 with Homebrew 7.0.1-11-gd2c0312 under
 * `HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_ENV_HINTS=1`.
 */

const NEOVIM = `==> Would install 1 formula:
neovim
==> Downloading https://ghcr.io/v2/homebrew/core/neovim/manifests/0.12.5_1
Already downloaded: /Users/messina/Library/Caches/Homebrew/downloads/8759d67d40a205422a7f2e53d672eb7869561091ed5519077ddd4412d59b14c2--neovim-0.12.5_1.bottle_manifest.json
==> Would install 5 dependencies for neovim:
lpeg
luajit
luv
tree-sitter
unibilium
`;

const GRAPHVIZ = `==> Would install 1 formula:
graphviz
==> Downloading https://ghcr.io/v2/homebrew/core/graphviz/manifests/16.0.0
Already downloaded: /Users/messina/Library/Caches/Homebrew/downloads/9bf7eefd08319247512c4c9beb2514902f607e233c220af91d429b28dd0e8811--graphviz-16.0.0.bottle_manifest.json
==> Would install 4 dependencies for graphviz:
gd
jasper
netpbm
gts
==> Would upgrade 6 dependencies for graphviz:
pcre2
libvmaf
aom
xz
harfbuzz
librsvg
`;

const AOM = `aom 3.14.1 is already installed but outdated (so it will be upgraded).
==> Would install 1 formula:
aom
==> Downloading https://ghcr.io/v2/homebrew/core/aom/manifests/3.15.0
Already downloaded: /Users/messina/Library/Caches/Homebrew/downloads/99aabe8f16faca2aee5e26f51724fd228291e4a18bca7a26f3d204803e6a524f--aom-3.15.0.bottle_manifest.json
==> Would upgrade 1 dependency for aom:
libvmaf
==> Would upgrade 4 dependents of upgraded formula:
imagemagick       7.1.2-30 -> 7.1.2-31
libheif           1.23.1_1 -> 1.23.4
imagemagick-full  7.1.2-30 -> 7.1.2-31
ocrmypdf          17.10.0  -> 17.11.0
`;

const ITERM2 = `==> Would install 1 cask:
iterm2
`;

const VERACRYPT = `==> Would install 1 cask:
veracrypt
==> Would install 1 dependency for veracrypt:
macfuse
`;

describe("parseDryRun", () => {
  it("reads the package section and its dependencies, ignoring download noise", () => {
    expect(parseDryRun(NEOVIM)).toEqual([
      { verb: "install", noun: "formula", count: 1, entries: [{ name: "neovim" }] },
      {
        verb: "install",
        noun: "dependency",
        count: 5,
        for: "neovim",
        entries: [
          { name: "lpeg" },
          { name: "luajit" },
          { name: "luv" },
          { name: "tree-sitter" },
          { name: "unibilium" },
        ],
      },
    ]);
  });

  it("keeps install and upgrade dependency sections apart", () => {
    const sections = parseDryRun(GRAPHVIZ);
    expect(sections.map((s) => [s.verb, s.noun, s.count, s.for])).toEqual([
      ["install", "formula", 1, undefined],
      ["install", "dependency", 4, "graphviz"],
      ["upgrade", "dependency", 6, "graphviz"],
    ]);
    expect(sections[1].entries).toEqual([{ name: "gd" }, { name: "jasper" }, { name: "netpbm" }, { name: "gts" }]);
    expect(sections[2].entries[0]).toEqual({ name: "pcre2" });
  });

  it("reads the columnised dependents block as name/from/to, and ignores the leading prose line", () => {
    const sections = parseDryRun(AOM);
    expect(sections.map((s) => s.noun)).toEqual(["formula", "dependency", "dependent"]);
    const dependents = sections[2];
    expect(dependents.verb).toBe("upgrade");
    expect(dependents.count).toBe(4);
    expect(dependents.entries).toEqual([
      { name: "imagemagick", from: "7.1.2-30", to: "7.1.2-31" },
      { name: "libheif", from: "1.23.1_1", to: "1.23.4" },
      { name: "imagemagick-full", from: "7.1.2-30", to: "7.1.2-31" },
      { name: "ocrmypdf", from: "17.10.0", to: "17.11.0" },
    ]);
  });

  it("reads a cask plan, including the merged dependency list", () => {
    expect(parseDryRun(ITERM2)).toEqual([{ verb: "install", noun: "cask", count: 1, entries: [{ name: "iterm2" }] }]);
    expect(parseDryRun(VERACRYPT)).toEqual([
      { verb: "install", noun: "cask", count: 1, entries: [{ name: "veracrypt" }] },
      { verb: "install", noun: "dependency", count: 1, for: "veracrypt", entries: [{ name: "macfuse" }] },
    ]);
  });

  it("reads the space-joined one-line form brew uses for cask sections", () => {
    // `install.rb` prints cask names and cask dependencies with `join(" ")`,
    // so more than one of either arrives on a single line.
    const sections = parseDryRun(`==> Would install 2 dependencies for veracrypt:
macfuse osxfuse
`);
    expect(sections[0].entries).toEqual([{ name: "macfuse" }, { name: "osxfuse" }]);
  });

  it("is empty for empty output", () => {
    expect(parseDryRun("")).toEqual([]);
  });
});

/**
 * Real `brew upgrade --dry-run` output, captured verbatim on 2026-09-15 with
 * Homebrew 7.0.2-6-g9221b88 under `HOMEBREW_NO_AUTO_UPDATE=1
 * HOMEBREW_NO_ENV_HINTS=1`, the two streams redirected to separate files.
 * Trimmed to a representative slice of the 80-row table; every row below is
 * byte-for-byte brew's, alignment included.
 *
 * The table and its `==>` heading are STDOUT (`cmd/upgrade.rb:975-981`).
 */
const UPGRADE_ALL_STDOUT = `==> Would upgrade 79 outdated packages
readline                          8.3.3                                            -> 8.3.6 (757KB)
pipx                              1.16.7                                           -> 1.17.2 (509.2KB)
node                              26.8.1                                           -> 26.8.2 (19.8MB)
mermaid-cli                       11.16.0                                          -> 11.17.0 (94.4MB)
steipete/tap/birdclaw             0.12.1                                           -> 0.14.0
cursor                            3.17.21,8f2a112cb2845a97b75fd932ea5c470579ca4063 -> 3.20.21,f09fca384ceca23f7bf21f9c23655b162641d747
`;

/**
 * The STDERR half of the same run: the manifest region (`download_queue.rb:120`
 * and `:458`, both `$stderr.puts`) and the `Warning:` blocks.
 *
 * The wrapped warning is verbatim from the 2026-09-15 capture. The manifest
 * lines are verbatim from the 2026-09-14 capture of the same command — on
 * 2026-09-15 every manifest was already in brew's download cache, so brew
 * printed none.
 *
 * SYNTHETIC: the two `Not upgrading …` lines. Homebrew emits consecutive
 * `Warning:` lines while evaluating several casks, but nothing on this machine
 * was in that state at capture time, so those two lines alone are written by
 * hand in brew's wording rather than captured.
 */
const UPGRADE_ALL_STDERR = `==> Downloading bottle manifests
✔︎ Bottle Manifest readline (8.3.6)
✔︎ Bottle Manifest node (26.8.2)
Warning: The following dependents of upgraded formulae are outdated but will not
be upgraded because they are not bottled:
  birdclaw
  happenstance
Warning: Not upgrading cursor, the latest version is already installed
Warning: Not upgrading zed, the latest version is already installed
`;

/**
 * Joined the way the caller joins them:
 * `/Users/messina/Developer/GitHub/chrismessina/brew/src/components/installPreview.tsx:347`
 * — stdout first, then stderr.
 */
const UPGRADE_ALL = [UPGRADE_ALL_STDOUT, UPGRADE_ALL_STDERR].join("\n");

/** The single-package form, same capture date. */
const UPGRADE_ONE = `==> Would upgrade 1 requested outdated package
openssl@4 4.0.1 -> 4.0.2 (11MB)
`;

/**
 * The four shapes `brew upgrade --dry-run --no-ask <name>` produces, all REAL
 * stdout/stderr captured verbatim on 2026-09-15 with Homebrew 7.0.2-9-g52f15df
 * under `HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_ENV_HINTS=1`, the two streams
 * redirected to separate files.
 *
 * The requested package's own row is UNPADDED (`upgrade.rb:29` skips the
 * padding for a batch of one) while the dependency and dependent blocks that
 * follow are padded to the widest of THEIR batch — the two styles land in one
 * output, which is why rows are split on ` -> ` and never by column.
 */

/** Stdout for an outdated formula that drags dependents along (`aom`). */
const UPGRADE_ONE_WITH_DEPENDENTS = `==> Would upgrade 1 requested outdated package
aom 3.14.1 -> 3.15.0 (4.4MB)
==> Would upgrade 4 dependents
imagemagick       7.1.2-30 -> 7.1.2-31 (11MB)
libheif           1.23.1_1 -> 1.23.4 (3.0MB)
imagemagick-full  7.1.2-30 -> 7.1.2-31 (11.3MB)
ocrmypdf          17.10.0  -> 17.11.0 (16.8MB)
`;

/**
 * Stdout for a TAP-QUALIFIED formula whose dependencies are also outdated.
 * Note the order: brew prints the dependency block BEFORE the requested row.
 */
const UPGRADE_ONE_TAPPED = `==> Would upgrade 4 dependencies:
simdutf   9.1.0  -> 9.1.2
readline  8.3.3  -> 8.3.6
xz        5.8.3  -> 5.8.4
node      26.8.1 -> 26.8.2
==> Would upgrade 1 requested outdated package
steipete/tap/birdclaw 0.12.1 -> 0.14.0
`;

/**
 * Already up to date (`ada-url`). Exit 0, stdout EMPTY, one line on stderr.
 * Reachable from the UI: open a preview, upgrade elsewhere, refresh.
 */
const UPGRADE_ONE_UP_TO_DATE_STDERR = `Warning: ada-url 4.0.0 already installed
`;

/**
 * Not installed (`jq`). Exit **1**, stdout EMPTY, one line on stderr — which is
 * why `brewUpgradeDryRun` tolerates an exit 1 that still produced output.
 */
const UPGRADE_ONE_NOT_INSTALLED_STDERR = `Error: jq not installed
`;

/**
 * A PINNED, outdated formula named explicitly. Exit **1**.
 *
 * SYNTHETIC — derived from the Ruby, not captured: `brew list --pinned` was
 * empty on this machine on 2026-09-15, and creating the case would mean
 * pinning something. Wording is `cmd/upgrade.rb:471-476` — `ofail "Not
 * upgrading #{pinned.count} pinned #{Utils.pluralize("package", ...)}:"`, which
 * `onoe` prefixes with `Error: ` (`utils/output.rb:108-111`) onto STDERR, then
 * `puts pinned.map { |f| "#{f.full_specified_name} #{f.pkg_version}" }` onto
 * STDOUT. `--dry-run` leaves `show_upgrade_summary` false (`:336`), so no
 * heading precedes it.
 */
const UPGRADE_ONE_PINNED_STDOUT = `node 26.8.1
`;
const UPGRADE_ONE_PINNED_STDERR = `Error: Not upgrading 1 pinned package:
`;

describe("brewUpgradeDryRun", () => {
  it("returns an empty plan for a target that is already up to date", async () => {
    // `opoo`, exit 0 (`cmd/upgrade.rb:421`) — never a rejection.
    brewRun.outcome = () => ({ stdout: "", stderr: UPGRADE_ONE_UP_TO_DATE_STDERR });
    const result = await brewUpgradeDryRun({ name: "ada-url" });
    expect(parseUpgradeDryRun([result.stdout, result.stderr].join("\n")).entries).toEqual([]);
  });

  it("returns an empty plan for a target that is not installed, despite exit 1", async () => {
    brewRun.outcome = () => {
      throw execFailure(1, "", UPGRADE_ONE_NOT_INSTALLED_STDERR);
    };
    const result = await brewUpgradeDryRun({ name: "jq" });
    expect(result.stderr).toBe(UPGRADE_ONE_NOT_INSTALLED_STDERR);
    expect(parseUpgradeDryRun([result.stdout, result.stderr].join("\n")).entries).toEqual([]);
  });

  it("throws on a pinned refusal rather than presenting it as nothing to upgrade", async () => {
    brewRun.outcome = () => {
      throw execFailure(1, UPGRADE_ONE_PINNED_STDOUT, UPGRADE_ONE_PINNED_STDERR);
    };
    await expect(brewUpgradeDryRun({ name: "node" })).rejects.toThrow(/exit code 1/);
  });

  it("throws on any other exit 1, even when brew printed something", async () => {
    brewRun.outcome = () => {
      throw execFailure(1, "", "Error: Failure while executing: git fetch origin\n");
    };
    await expect(brewUpgradeDryRun({ name: "node" })).rejects.toThrow(/exit code 1/);
  });
});

describe("parseUpgradeDryRun", () => {
  const planAll = parseUpgradeDryRun(UPGRADE_ALL);

  it("skips the manifest region and reads one entry per table row, sizes and tap prefixes verbatim", () => {
    expect(planAll.entries).toEqual([
      { name: "readline", from: "8.3.3", to: "8.3.6", bytes: 757_000 },
      { name: "pipx", from: "1.16.7", to: "1.17.2", bytes: 509_200 },
      { name: "node", from: "26.8.1", to: "26.8.2", bytes: 19_800_000 },
      { name: "mermaid-cli", from: "11.16.0", to: "11.17.0", bytes: 94_400_000 },
      { name: "steipete/tap/birdclaw", from: "0.12.1", to: "0.14.0", bytes: undefined },
      {
        name: "cursor",
        from: "3.17.21,8f2a112cb2845a97b75fd932ea5c470579ca4063",
        to: "3.20.21,f09fca384ceca23f7bf21f9c23655b162641d747",
        bytes: undefined,
      },
    ]);
  });

  it("keeps consecutive warnings apart instead of folding them into one", () => {
    expect(planAll.warnings).toHaveLength(3);
    // The two single-line warnings are untouched by the list handling.
    expect(planAll.warnings.slice(1)).toEqual([
      "Not upgrading cursor, the latest version is already installed",
      "Not upgrading zed, the latest version is already installed",
    ]);
  });

  it("unwraps the prose but keeps brew's indented package list as list items", () => {
    // Brew hard-wraps the sentence with an UNINDENTED continuation and prints
    // the packages it is about two-space indented below it. Folding both into
    // one line produced a run-on ending "…not bottled: birdclaw happenstance".
    expect(planAll.warnings[0]).toBe(
      "The following dependents of upgraded formulae are outdated but will not be upgraded " +
        "because they are not bottled:\n\n- birdclaw\n- happenstance",
    );
    const [sentence, blank, ...items] = planAll.warnings[0].split("\n");
    expect(sentence.endsWith("they are not bottled:")).toBe(true);
    expect(blank).toBe("");
    expect(items).toEqual(["- birdclaw", "- happenstance"]);
  });

  it("totals only the rows that carried a size", () => {
    expect(planAll.totalBytes).toBe(757_000 + 509_200 + 19_800_000 + 94_400_000);
    expect(formatBrewSize(planAll.totalBytes)).toBe("115.5MB");
  });

  it("reads the single-package form, which is not column-padded", () => {
    const plan = parseUpgradeDryRun(UPGRADE_ONE);
    expect(plan.entries).toEqual([{ name: "openssl@4", from: "4.0.1", to: "4.0.2", bytes: 11_000_000 }]);
    expect(plan.warnings).toEqual([]);
  });

  it("reads the unpadded requested row alongside the padded dependents block", () => {
    const plan = parseUpgradeDryRun(UPGRADE_ONE_WITH_DEPENDENTS);
    expect(plan.entries).toEqual([
      { name: "aom", from: "3.14.1", to: "3.15.0", bytes: 4_400_000 },
      { name: "imagemagick", from: "7.1.2-30", to: "7.1.2-31", bytes: 11_000_000 },
      { name: "libheif", from: "1.23.1_1", to: "1.23.4", bytes: 3_000_000 },
      { name: "imagemagick-full", from: "7.1.2-30", to: "7.1.2-31", bytes: 11_300_000 },
      { name: "ocrmypdf", from: "17.10.0", to: "17.11.0", bytes: 16_800_000 },
    ]);
  });

  it("keeps a single target's tap prefix verbatim, dependency block and all", () => {
    const plan = parseUpgradeDryRun(UPGRADE_ONE_TAPPED);
    expect(plan.entries.map((e) => e.name)).toEqual(["simdutf", "readline", "xz", "node", "steipete/tap/birdclaw"]);
    expect(plan.entries[4]).toEqual({ name: "steipete/tap/birdclaw", from: "0.12.1", to: "0.14.0", bytes: undefined });
    expect(plan.totalBytes).toBe(0);
  });

  it("is an empty plan when the target is already up to date", () => {
    const plan = parseUpgradeDryRun(["", UPGRADE_ONE_UP_TO_DATE_STDERR].join("\n"));
    expect(plan.entries).toEqual([]);
    expect(plan.warnings).toEqual(["ada-url 4.0.0 already installed"]);
    expect(plan.totalBytes).toBe(0);
  });

  it("is an empty plan when the target is not installed at all", () => {
    // brew exits 1 here with nothing on stdout; `brewUpgradeDryRun` returns the
    // run rather than throwing, so the parser has to survive the stderr alone.
    const plan = parseUpgradeDryRun(["", UPGRADE_ONE_NOT_INSTALLED_STDERR].join("\n"));
    expect(plan).toEqual({ entries: [], warnings: [], totalBytes: 0 });
  });

  it("is empty for empty output", () => {
    expect(parseUpgradeDryRun("")).toEqual({ entries: [], warnings: [], totalBytes: 0 });
  });
});

describe("formatBrewSize", () => {
  it("matches brew's own units, which are powers of 1000 (formatter.rb:183-193)", () => {
    expect(formatBrewSize(757_000)).toBe("757KB");
    expect(formatBrewSize(11_000_000)).toBe("11MB");
    expect(formatBrewSize(509_200)).toBe("509.2KB");
    expect(formatBrewSize(0)).toBe("0B");
  });

  // brew picks the unit BEFORE rounding and keeps the decimal whenever the
  // pre-rounded value was fractional, so the unit boundaries read as 1000.0,
  // not 1KB (`Formatter.disk_usage_readable`, formatter.rb:181-204).
  it("matches brew at the unit boundaries", () => {
    expect(formatBrewSize(999.96)).toBe("1000.0B");
    expect(formatBrewSize(999_950)).toBe("1000.0KB");
    expect(formatBrewSize(999_950_000)).toBe("1000.0MB");
    expect(formatBrewSize(999)).toBe("999B");
    expect(formatBrewSize(1000)).toBe("1KB");
  });
});
