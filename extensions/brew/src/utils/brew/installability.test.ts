/**
 * Whether Homebrew would refuse to install a package on THIS machine.
 *
 * Fixtures are copied verbatim from the real `cask.json` / `formula.json` the
 * extension downloads (captured 2026-09-14), because the shapes are the whole
 * problem: `depends_on.macos` is `{}` for half the catalogue, `maximum_macos`
 * is a sibling key rather than an operator, a cask's Linux requirement is a
 * Ruby inspect string, and a formula's requirement carries a `contexts` array
 * whose `"test"` and `"build"` entries both mean the requirement does not
 * apply to an ordinary bottle install.
 */

import { describe, expect, it } from "vitest";
import { installabilityOf } from "./installability";
import type { BrewHost } from "./installability";
import type { Cask, Formula, FormulaRequirement } from "../types";

const HOST: BrewHost = { macos: "26.6.2", arch: "arm64" };

function cask(over: Partial<Cask>): Cask {
  return {
    token: "example",
    name: ["Example"],
    tap: "homebrew/cask",
    homepage: "https://example.com",
    version: "1.0.0",
    versions: { stable: "1.0.0", bottle: false },
    outdated: false,
    auto_updates: false,
    pinned: false,
    depends_on: {},
    ...over,
  } as Cask;
}

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

function reason(result: ReturnType<typeof installabilityOf>): string | undefined {
  return result.installable ? undefined : result.reason;
}

describe("installabilityOf — casks", () => {
  // Real: agentide, depends_on.macos {">=":["27"]} + arm64.
  const agentide = cask({
    token: "agentide",
    depends_on: { macos: { ">=": ["27"] }, arch: [{ type: "arm", bits: 64 }] },
  });

  it("blocks a cask that needs a newer macOS than this Mac runs", () => {
    expect(reason(installabilityOf(agentide, HOST))).toBe("Requires macOS 27 or newer");
  });

  it("installs the same cask once the Mac is new enough", () => {
    expect(installabilityOf(agentide, { macos: "27.0", arch: "arm64" }).installable).toBe(true);
  });

  it("reports disabled ahead of the architecture it also fails", () => {
    // Real: amd-power-gadget — disabled AND intel-only.
    const amd = cask({
      token: "amd-power-gadget",
      disabled: true,
      depends_on: { arch: [{ type: "intel", bits: 64 }], macos: {} },
    });
    expect(reason(installabilityOf(amd, HOST))).toBe("Disabled by Homebrew");
  });

  it("blocks a cask capped below this macOS, and allows it on an older Mac", () => {
    // Real: mailtrackerblocker, maximum_macos {"<=":["13"]}.
    const capped = cask({ token: "mailtrackerblocker", depends_on: { maximum_macos: { "<=": ["13"] } } });
    expect(reason(installabilityOf(capped, HOST))).toBe("Requires macOS 13 or older");
    expect(installabilityOf(capped, { macos: "13.6", arch: "arm64" }).installable).toBe(true);
  });

  it("honours an explicit == list", () => {
    // Real: calhash, macos {"==":["11","12","13","14","15","26"]}.
    const listed = cask({
      token: "calhash",
      depends_on: { macos: { "==": ["11", "12", "13", "14", "15", "26"] } },
    });
    expect(installabilityOf(listed, HOST).installable).toBe(true);
    expect(reason(installabilityOf(listed, { macos: "27.0", arch: "arm64" }))).toBe(
      "Requires macOS 11, 12, 13, 14, 15, 26",
    );
  });

  it("leaves a satisfied, bare or absent depends_on alone", () => {
    expect(
      installabilityOf(cask({ token: "1password", depends_on: { macos: { ">=": ["12"] } } }), HOST).installable,
    ).toBe(true);
    expect(installabilityOf(cask({ depends_on: { macos: {} } }), HOST).installable).toBe(true);
    expect(installabilityOf(cask({ depends_on: {} }), HOST).installable).toBe(true);
  });

  it("blocks an intel-only cask on Apple Silicon and allows it on Intel", () => {
    const intelOnly = cask({ depends_on: { arch: [{ type: "intel", bits: 64 }] } });
    expect(reason(installabilityOf(intelOnly, HOST))).toBe("Requires x86_64");
    expect(installabilityOf(intelOnly, { macos: "26.6.2", arch: "x86_64" }).installable).toBe(true);
  });

  it("blocks a Linux-only cask", () => {
    // Real: koreader — the value is a Ruby inspect string; presence is the signal.
    const linux = cask({ token: "koreader", depends_on: { linux: "#<LinuxRequirement:0x000000012b1d3220>" } });
    expect(reason(installabilityOf(linux, HOST))).toBe("Linux only");
  });

  it("degrades to installable on a depends_on shape it does not understand", () => {
    // Neither shape appears in today's API, but a throw here would take out the
    // render of an entire list row, so the module has to shrug instead.
    const bareOperatorValue = cask({ depends_on: { macos: { ">=": "27" } } as unknown as Cask["depends_on"] });
    expect(installabilityOf(bareOperatorValue, HOST).installable).toBe(true);

    const archNotAnArray = cask({ depends_on: { arch: { type: "intel" } } as unknown as Cask["depends_on"] });
    expect(installabilityOf(archNotAnArray, HOST).installable).toBe(true);
  });

  it("never marks when the host macOS is unknown, but still checks arch", () => {
    expect(installabilityOf(agentide, { macos: undefined, arch: "arm64" }).installable).toBe(true);
    expect(
      reason(
        installabilityOf(cask({ depends_on: { arch: [{ type: "intel" }] } }), { macos: undefined, arch: "arm64" }),
      ),
    ).toBe("Requires x86_64");
  });
});

describe("installabilityOf — formulae", () => {
  it("blocks a formula that needs a newer macOS, and allows it on this one", () => {
    // Real: age-plugin-se, requirement macos version "26".
    const agePluginSe = formula({
      name: "age-plugin-se",
      requirements: [{ name: "macos", version: "26", contexts: [] }],
    });
    expect(installabilityOf(agePluginSe, HOST).installable).toBe(true);
    expect(reason(installabilityOf(agePluginSe, { macos: "15.7", arch: "arm64" }))).toBe("Requires macOS 26 or newer");
  });

  it("blocks an x86_64-only formula on Apple Silicon", () => {
    // Real: amdatu-bootstrap, requirement arch version "x86_64".
    const amdatu = formula({
      name: "amdatu-bootstrap",
      requirements: [{ name: "arch", version: "x86_64", contexts: [] }],
    });
    expect(reason(installabilityOf(amdatu, HOST))).toBe("Requires x86_64");
  });

  it("blocks a Linux-only formula", () => {
    // Real: acl.
    const acl = formula({ name: "acl", requirements: [{ name: "linux", version: null, contexts: [] }] });
    expect(reason(installabilityOf(acl, HOST))).toBe("Linux only");
  });

  it("ignores a build-context requirement", () => {
    // Real: anyzig, maximum_macos "15" in the build context. Homebrew prunes a
    // build requirement whenever it pours a bottle, which is the normal case —
    // and brew installs this one fine on a macOS 26/27 arm64 Mac.
    const anyzig = formula({
      name: "anyzig",
      requirements: [{ name: "maximum_macos", version: "15", contexts: ["build"] }],
    });
    expect(installabilityOf(anyzig, HOST).installable).toBe(true);
  });

  it("degrades to applying the requirement when contexts is not an array", () => {
    // `contexts` is `unknown[]` off parsed JSON. A scalar has no `.some()`, and
    // a throw here would take out the render of an entire list row.
    const malformed = formula({
      name: "synthetic-scalar-contexts",
      requirements: [{ name: "maximum_macos", version: "15", contexts: "build" } as unknown as FormulaRequirement],
    });
    expect(reason(installabilityOf(malformed, HOST))).toBe("Requires macOS 15 or older");
  });

  it("still blocks a requirement with no context — it applies to every install", () => {
    const always = formula({
      name: "synthetic-no-context",
      requirements: [{ name: "maximum_macos", version: "15", contexts: [] }],
    });
    expect(reason(installabilityOf(always, HOST))).toBe("Requires macOS 15 or older");
  });

  it("ignores a test-context requirement", () => {
    const testOnly = formula({
      name: "synthetic-test-context",
      requirements: [{ name: "maximum_macos", version: "15", contexts: ["test"] }],
    });
    expect(installabilityOf(testOnly, HOST).installable).toBe(true);
  });

  it("treats an empty, absent, versionless or unknown requirement as no constraint", () => {
    expect(installabilityOf(formula({ requirements: [] }), HOST).installable).toBe(true);
    expect(installabilityOf(formula({}), HOST).installable).toBe(true);
    expect(
      installabilityOf(formula({ requirements: [{ name: "macos", version: null, contexts: [] }] }), HOST).installable,
    ).toBe(true);
    expect(
      installabilityOf(formula({ requirements: [{ name: "xcode", version: "26.0", contexts: [] }] }), HOST).installable,
    ).toBe(true);
  });

  it("does not guess at a non-numeric version string", () => {
    expect(
      installabilityOf(formula({ requirements: [{ name: "macos", version: "sequoia", contexts: [] }] }), HOST)
        .installable,
    ).toBe(true);
  });

  it("reports disabled first", () => {
    const disabled = formula({
      disabled: true,
      requirements: [{ name: "arch", version: "x86_64", contexts: [] }],
    });
    expect(reason(installabilityOf(disabled, HOST))).toBe("Disabled by Homebrew");
  });
});
