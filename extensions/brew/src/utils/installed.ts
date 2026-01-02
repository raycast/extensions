import { InstallableFilterType } from "../components/filter";
import type { InstalledMap } from "./brew";

export const showInstalledPackages = (
  installed: InstalledMap | undefined,
  filter: InstallableFilterType,
  excludeDependencies: boolean,
) => {
  const formulae =
    filter !== InstallableFilterType.casks && installed?.formulae instanceof Map
      ? Array.from(installed.formulae.values())
      : [];

  return {
    formulae: excludeDependencies
      ? formulae.filter((formula) => formula.installed.some((version) => version.installed_on_request))
      : formulae,
    casks:
      filter !== InstallableFilterType.formulae && installed?.casks instanceof Map
        ? Array.from(installed.casks.values())
        : [],
  } as const;
};
