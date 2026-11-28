import { InstalledFilterType } from "../components/filter";
import type { InstalledMap } from "./brew";
import { effectiveKeg } from "./brew/helpers";
import type { Formula } from "./types";

/** True when this formula was asked for by the user, not pulled in by another package. */
export const isInstalledOnRequest = (formula: Formula): boolean => effectiveKeg(formula)?.installed_on_request ?? false;

/**
 * Names every installed formula or cask depends on: the effective keg's tab
 * runtime deps (short name — `cameroncooke/axe/axe` → `axe`), cask formula
 * deps, and the build dependencies Homebrew keeps (`keptBuildDependencies`).
 * Built once per render; `isLeaf` is then a Set lookup.
 */
export const dependedOnNames = (installed: InstalledMap | undefined): ReadonlySet<string> => {
  const names = new Set<string>();
  if (installed?.formulae instanceof Map) {
    const formulae = Array.from(installed.formulae.values());
    for (const formula of formulae) {
      for (const dependency of effectiveKeg(formula)?.runtime_dependencies ?? []) {
        names.add(shortName(dependency.full_name));
      }
    }
    for (const name of keptBuildDependencies(formulae)) {
      names.add(name);
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

/**
 * Build dependencies Homebrew keeps installed, mirroring
 * `InstalledDependents.build_dependents_by_name` (installed_dependents.rb): one
 * stays while an installed formula would need it to build again, because that
 * formula was built from source or has no bottle, or while the dependency was
 * itself built from source. From Homebrew 7.0.16 `brew uninstall` refuses to
 * remove one, and `brew autoremove` keeps it. A missing `poured_from_bottle`
 * counts as built from source, as it does in brew. `pour_bottle?` is a runtime
 * check with no JSON field; `versions.bottle` stands in for it.
 */
const keptBuildDependencies = (formulae: readonly Formula[]): Set<string> => {
  const builtFromSource = new Set(
    formulae
      .filter((formula) => effectiveKeg(formula)?.poured_from_bottle !== true)
      .flatMap((formula) => [formula.name, ...formula.aliases, ...(formula.oldnames ?? [])]),
  );
  const kept = new Set<string>();
  for (const formula of formulae) {
    const keg = effectiveKeg(formula);
    const poursBottle = keg?.poured_from_bottle === true && formula.versions?.bottle === true;
    // Brew checks the installed spec: a `--HEAD` keg's own list when it differs.
    const head = keg?.version.startsWith("HEAD") ? formula.head_dependencies : undefined;
    for (const dependency of head?.build_dependencies ?? formula.build_dependencies ?? []) {
      const name = shortName(dependency);
      if (!poursBottle || builtFromSource.has(name)) kept.add(name);
    }
  }
  return kept;
};

/** `cameroncooke/axe/axe` → `axe`, matching Homebrew's `Utils.name_from_full_name`. */
const shortName = (fullName: string): string => fullName.split("/").pop() ?? fullName;

/** Nothing installed depends on it, at run time or as a build dependency Homebrew keeps. */
export const isLeaf = (formula: Formula, dependedOn: ReadonlySet<string>): boolean =>
  ![formula.name, ...formula.aliases, ...(formula.oldnames ?? [])].some((name) => dependedOn.has(name));

/**
 * A dependency nothing installed needs right now. Close to, not the same as,
 * what `brew autoremove` removes: autoremove also takes chains (a dependency
 * only this one needs is tagged once this one goes) and honors
 * `HOMEBREW_NO_CLEANUP_FORMULAE`. Build dependencies approximate brew's rule
 * from the JSON, which cannot show a bottle that exists but is unusable on
 * this Mac, a `uses_from_macos ... since:` build dependency, or an implicit
 * one such as Mercurial for an `hg` source.
 */
export const isUnusedDependency = (formula: Formula, dependedOn: ReadonlySet<string>): boolean =>
  !isInstalledOnRequest(formula) && isLeaf(formula, dependedOn);

export const showInstalledPackages = (installed: InstalledMap | undefined, filter: InstalledFilterType) => {
  const formulae = installed?.formulae instanceof Map ? Array.from(installed.formulae.values()) : [];
  const casks = installed?.casks instanceof Map ? Array.from(installed.casks.values()) : [];
  const onRequest = filter !== InstalledFilterType.dependencies && filter !== InstalledFilterType.casks;
  const dependencies = filter === InstalledFilterType.all || filter === InstalledFilterType.dependencies;
  const showCasks =
    filter === InstalledFilterType.all || filter === InstalledFilterType.yours || filter === InstalledFilterType.casks;
  // A pin is an explicit decision, so Installed by You keeps a pinned
  // dependency; Formulae and Dependencies each keep only their own kind.
  const pinnedShown = (formula: Formula) =>
    filter === InstalledFilterType.all || filter === InstalledFilterType.yours
      ? true
      : isInstalledOnRequest(formula)
        ? onRequest
        : dependencies;

  return {
    formulae: onRequest ? formulae.filter((formula) => !formula.pinned && isInstalledOnRequest(formula)) : [],
    dependencies: dependencies ? formulae.filter((formula) => !formula.pinned && !isInstalledOnRequest(formula)) : [],
    pinnedFormulae: formulae.filter((formula) => formula.pinned && pinnedShown(formula)),
    casks: showCasks ? casks.filter((cask) => !cask.pinned) : [],
    pinnedCasks: showCasks ? casks.filter((cask) => cask.pinned) : [],
  } as const;
};
