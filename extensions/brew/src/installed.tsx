/**
 * Installed view for displaying installed brew packages.
 */

import { useState } from "react";
import { useCachedState } from "@raycast/utils";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { FormulaList } from "./components/list";
import { useBrewDependencies } from "./hooks/useBrewDependencies";
import { useBrewInstalled } from "./hooks/useBrewInstalled";
import { isInstalled } from "./hooks/useBrewSearch";
import { uiLogger } from "./utils";
import { showInstalledPackages } from "./utils/installed";

function InstalledContent() {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [showDescription, setShowDescription] = useCachedState("show-description", true);
  const { isLoading, data: installed, revalidate } = useBrewInstalled();
  const [excludeDependencies] = useBrewDependencies();
  const { formulae, pinnedFormulae, casks } = showInstalledPackages(installed, filter, excludeDependencies);

  // Log rendering statistics
  if (installed && !isLoading) {
    uiLogger.log("Installed view rendered", {
      filter,
      formulaeDisplayed: formulae.length,
      pinnedFormulaeDisplayed: pinnedFormulae.length,
      casksDisplayed: casks.length,
      totalDisplayed: formulae.length + pinnedFormulae.length + casks.length,
      totalAvailable: (installed.formulae?.size ?? 0) + (installed.casks?.size ?? 0),
    });
  }

  // Determine search bar placeholder based on loading state
  const searchBarPlaceholder = isLoading ? "Loading installed packages…" : placeholder(filter);

  return (
    <FormulaList
      formulae={formulae}
      pinnedFormulae={pinnedFormulae}
      casks={casks}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={isLoading}
      dataFetched={installed !== undefined}
      showMetadataPanel={showMetadataPanel}
      onToggleSidebar={() => setShowMetadataPanel((current) => !current)}
      showDescription={showDescription}
      onToggleDescription={() => setShowDescription((current) => !current)}
      showInstalledDate
      showDependenciesFilter
      isInstalled={(name) => isInstalled(name, installed)}
      onAction={() => {
        uiLogger.log("Revalidating installed packages");
        revalidate();
      }}
    />
  );
}

export default function Main() {
  return (
    <ErrorBoundary>
      <InstalledContent />
    </ErrorBoundary>
  );
}
