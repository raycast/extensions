import { InstallableFilterType } from "../components/filter";
import type { InstalledMap } from "./brew";
import { effectiveKeg } from "./brew/helpers";
import type { Formula } from "./types";

/** True when this formula was asked for by the user, not pulled in by another package. */
export const isInstalledOnRequest = (formula: Formula): boolean => effectiveKeg(formula)?.installed_on_request ?? false;

/**
 * Names every installed formula or cask depends on, mirroring `brew leaves`:
 * the effective keg's tab runtime deps (short name — `cameroncooke/axe/axe` →
 * `axe`) plus cask formula deps. Built once per render; `isLeaf` is then a Set
 * lookup.
 */
export const dependedOnNames = (installed: InstalledMap | undefined): ReadonlySet<string> => {
  const names = new Set<string>();
  if (installed?.formulae instanceof Map) {
    for (const formula of installed.formulae.values()) {
      for (const dependency of effectiveKeg(formula)?.runtime_dependencies ?? []) {
        names.add(shortName(dependency.full_name));
      }
    }
  }
  if (installed?.casks instanceof Map) {
    for (const cask of installed.casks.values()) {
      for (const dependency of cask.depends_on?.formula ?? []) {
        names.add(shortName(dependency));
      }
    }
  }
  return names;
};

/** `cameroncooke/axe/axe` → `axe`, matching Homebrew's `Utils.name_from_full_name`. */
const shortName = (fullName: string): string => fullName.split("/").pop() ?? fullName;

/** Nothing installed depends on it — the `brew leaves` definition. */
export const isLeaf = (formula: Formula, dependedOn: ReadonlySet<string>): boolean =>
  ![formula.name, ...formula.aliases, ...(formula.oldnames ?? [])].some((name) => dependedOn.has(name));

/** A dependency nothing needs any more — what `brew autoremove` would remove. */
export const isUnusedDependency = (formula: Formula, dependedOn: ReadonlySet<string>): boolean =>
  !isInstalledOnRequest(formula) && isLeaf(formula, dependedOn);

export const showInstalledPackages = (
  installed: InstalledMap | undefined,
  filter: InstallableFilterType,
  excludeDependencies: boolean,
) => {
  const allFormulae =
    filter !== InstallableFilterType.casks && installed?.formulae instanceof Map
      ? Array.from(installed.formulae.values())
      : [];
  const unpinnedFormulae = allFormulae.filter((formula) => !formula.pinned);

  const allCasks =
    filter !== InstallableFilterType.formulae && installed?.casks instanceof Map
      ? Array.from(installed.casks.values())
      : [];

  return {
    formulae: unpinnedFormulae.filter(isInstalledOnRequest),
    // Sectioned rather than interleaved; ⌘D ("Hide Dependencies") empties the
    // section instead of filtering rows out of the Formulae one.
    dependencies: excludeDependencies ? [] : unpinnedFormulae.filter((formula) => !isInstalledOnRequest(formula)),
    // Split from the pre-dependency-filter array: a pin is an explicit user
    // decision, so a pinned dependency must stay visible even when
    // "Exclude Dependencies" is on.
    pinnedFormulae: allFormulae.filter((formula) => formula.pinned),
    casks: allCasks.filter((cask) => !cask.pinned),
    pinnedCasks: allCasks.filter((cask) => cask.pinned),
  } as const;
};
