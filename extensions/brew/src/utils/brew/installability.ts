/**
 * Would Homebrew refuse to install this package on THIS machine?
 *
 * Homebrew 7 prints ⊘ for such a package (`utils/output.rb` `pretty_install_status`),
 * but nothing in the API JSON says "uninstallable" — it has to be derived from
 * `disabled` plus the platform constraints (`depends_on` for casks,
 * `requirements[]` for formulae), which are identical under Homebrew 6 and 7.
 *
 * Deliberately import-free apart from types and `compareVersions`: everything
 * else under `brew/` reaches `@raycast/api` transitively, and this is the piece
 * worth having under a plain unit test.
 *
 * Bias: never mark on a guess. An unknown operator, an unknown requirement
 * name, a non-numeric version, an unknown host — all read as "installable".
 * A false ⊘ hides a package the user could have had.
 */

import type { Cask, Formula, FormulaRequirement } from "../types";
import { compareVersions } from "./version";

export type BrewArch = "arm64" | "x86_64";

export interface BrewHost {
  /** `sw_vers -productVersion`, e.g. "26.6.2". Undefined when it could not be read. */
  macos: string | undefined;
  /**
   * Undefined when the brew install's architecture could not be determined —
   * a `customBrewPath` under a non-standard prefix. The arch gate is skipped
   * rather than guessed.
   */
  arch: BrewArch | undefined;
}

export type Installability = { installable: true } | { installable: false; reason: string };

const INSTALLABLE: Installability = { installable: true };

function blocked(reason: string): Installability {
  return { installable: false, reason };
}

/** `cask/dsl/depends_on.rb:26-29`. An unknown type is ignored, not failed. */
const ARCH_BY_CASK_TYPE: Record<string, BrewArch | undefined> = { arm: "arm64", intel: "x86_64" };

/**
 * Homebrew compares macOS majors for ≥ 11 (`macos_version.rb` `strip_patch`),
 * so "26.6.2" is compared as "26".
 */
function majorOf(macos: string | undefined): string | undefined {
  return macos?.split(".")[0];
}

/** The reason a `{ ">=": ["27"] }`-style constraint set is unmet, if it is. */
function macosReason(constraints: Record<string, string[] | undefined> | undefined, major: string): string | undefined {
  for (const [operator, values] of Object.entries(constraints ?? {})) {
    // `{">=": "12"}` instead of `{">=": ["12"]}` has not been seen in the API,
    // but a shape this module does not understand must degrade to "installable"
    // rather than throw inside a list row's render.
    if (!Array.isArray(values) || values.length === 0) {
      continue;
    }
    if (operator === ">=") {
      const unmet = values.find((v) => compareVersions(major, v) === -1);
      if (unmet) return `Requires macOS ${unmet} or newer`;
    } else if (operator === "<=") {
      const unmet = values.find((v) => compareVersions(major, v) === 1);
      if (unmet) return `Requires macOS ${unmet} or older`;
    } else if (operator === "==") {
      if (!values.some((v) => compareVersions(major, v) === 0)) return `Requires macOS ${values.join(", ")}`;
    }
  }
  return undefined;
}

function caskInstallability(cask: Cask, host: BrewHost): Installability {
  const dependsOn = cask.depends_on;
  if (dependsOn?.linux !== undefined) {
    return blocked("Linux only");
  }

  const major = majorOf(host.macos);
  if (major) {
    const reason = macosReason(dependsOn?.macos, major) ?? macosReason(dependsOn?.maximum_macos, major);
    if (reason) return blocked(reason);
  }

  const arches = (Array.isArray(dependsOn?.arch) ? dependsOn.arch : [])
    .map(({ type }) => ARCH_BY_CASK_TYPE[type])
    .filter((arch): arch is BrewArch => arch !== undefined);
  if (host.arch && arches.length > 0 && !arches.includes(host.arch)) {
    return blocked(`Requires ${arches.join(" or ")}`);
  }

  return INSTALLABLE;
}

/**
 * Requirements in the `test` context are ignored — brew never runs the test
 * block on install. `build` stays in: a source build genuinely needs it, and
 * the cost of keeping it is a false ⊘ on a package that would have poured a
 * bottle (`formula_installer.rb:770` prunes it only in that case).
 */
function applies(requirement: FormulaRequirement): boolean {
  return !requirement.contexts?.includes("test");
}

function formulaInstallability(formula: Formula, host: BrewHost): Installability {
  const requirements = (formula.requirements ?? []).filter(applies);

  // Homebrew's own order: OS family, then macOS version, then architecture.
  if (requirements.some((r) => r.name === "linux")) {
    return blocked("Linux only");
  }

  const major = majorOf(host.macos);
  if (major) {
    for (const { name, version } of requirements) {
      if (!version) continue;
      if (name === "macos" && compareVersions(major, version) === -1) {
        return blocked(`Requires macOS ${version} or newer`);
      }
      if (name === "maximum_macos" && compareVersions(major, version) === 1) {
        return blocked(`Requires macOS ${version} or older`);
      }
    }
  }

  const arch = requirements.find((r) => r.name === "arch" && r.version);
  if (host.arch && arch?.version && arch.version !== host.arch) {
    return blocked(`Requires ${arch.version}`);
  }

  return INSTALLABLE;
}

/**
 * Whether `item` can be installed on `host`. Callers gate on `brewIsInstalled`
 * first: an installed package is never marked, which is Homebrew's own
 * precedence (installed ✔ outranks ⊘).
 */
export function installabilityOf(item: Cask | Formula, host: BrewHost): Installability {
  if (item.disabled === true) {
    return blocked("Disabled by Homebrew");
  }
  // `token` is the cask discriminator, as in `isCask` — inlined rather than
  // imported, because helpers.ts pulls in @raycast/api.
  return "token" in item ? caskInstallability(item, host) : formulaInstallability(item, host);
}

/**
 * Why brew would refuse this package here, or undefined if it would not.
 *
 * Homebrew marks an uninstalled package it would refuse with ⊘, and an
 * installed package is never marked — installed ✔ outranks ⊘ — so callers gate
 * on `brewIsInstalled` before asking.
 */
export function uninstallableReason(item: Cask | Formula, host: BrewHost): string | undefined {
  const result = installabilityOf(item, host);
  return result.installable ? undefined : result.reason;
}
