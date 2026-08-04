import { InstallableFilterType } from "../components/filter";
import type { InstalledMap } from "./brew";

export const showInstalledPackages = (
  installed: InstalledMap | undefined,
  filter: InstallableFilterType,
  excludeDependencies: boolean,
) => {
  const allFormulae =
    filter !== InstallableFilterType.casks && installed?.formulae instanceof Map
      ? Array.from(installed.formulae.values())
      : [];
  const formulae = excludeDependencies
    ? allFormulae.filter((formula) => formula.installed.some((version) => version.installed_on_request))
    : allFormulae;

  return {
    formulae: formulae.filter((formula) => !formula.pinned),
    // Split from the pre-dependency-filter array: a pin is an explicit user
    // decision, so a pinned dependency must stay visible even when
    // "Exclude Dependencies" is on.
    pinnedFormulae: allFormulae.filter((formula) => formula.pinned),
    casks:
      filter !== InstallableFilterType.formulae && installed?.casks instanceof Map
        ? Array.from(installed.casks.values())
        : [],
  } as const;
};
