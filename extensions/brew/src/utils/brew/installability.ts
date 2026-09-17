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

export interface BrewHost {
  /** `sw_vers -productVersion`, e.g. "26.6.2". Undefined when it could not be read. */
  macos: string | undefined;
  /** What `brew` itself will report as HOMEBREW_PROCESSOR: see `host.ts`. */
  arch: "arm64" | "x86_64";
}

export type Installability = { installable: true } | { installable: false; reason: string };

const INSTALLABLE: Installability = { installable: true };

function blocked(reason: string): Installability {
  return { installable: false, reason };
}

/** `cask/dsl/depends_on.rb:26-29`. An unknown type is ignored, not failed. */
const ARCH_BY_CASK_TYPE: Record<string, BrewHost["arch"] | undefined> = { arm: "arm64", intel: "x86_64" };

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
    .filter((arch): arch is BrewHost["arch"] => arch !== undefined);
  if (arches.length > 0 && !arches.includes(host.arch)) {
    return blocked(`Requires ${arches.join(" or ")}`);
  }

  return INSTALLABLE;
}

/**
 * Only requirements that apply to an ordinary install count.
 *
 * `test` never runs on install. `build` is pruned by Homebrew whenever it pours
 * a bottle (`FormulaInstaller#expand_requirements`, via
 * `install_bottle_for_dependent`), which is the normal case — and every
 * `maximum_macos` requirement in the current index is build-context, so keeping
 * them marked 16 installable formulae as ⊘ (`anyzig`, `llvm@14`-`@17`,
 * `ghc@9.6`-`@9.10`, `zigup` and friends) and took Install, Preview Install and
 * Run in Terminal away from all of them.
 *
 * The residual cost runs the other way and is the one this module always
 * prefers: a formula with no bottle for this system, which brew really would
 * build from source, is no longer marked — it shows Install and fails in brew
 * with its own explanation. Marking only what brew would genuinely build needs
 * `bottle` in the search index, which is not in the chunked cache's
 * `valid_keys` and would cost a cache-version bump and a full re-download.
 */
const IGNORED_CONTEXTS = ["test", "build"];

function applies(requirement: FormulaRequirement): boolean {
  // `contexts` is `unknown[]` off parsed JSON, so the array is a declaration
  // and not a guarantee. A shape this module does not understand must read as
  // "the requirement applies" rather than throw inside a list row's render.
  const contexts = requirement.contexts;
  if (!Array.isArray(contexts)) return true;
  return !contexts.some((context) => typeof context === "string" && IGNORED_CONTEXTS.includes(context));
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
  if (arch?.version && arch.version !== host.arch) {
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
