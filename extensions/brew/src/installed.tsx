/**
 * Installed view for displaying installed brew packages.
 */

import { useState } from "react";
import { Cask, Formula, uiLogger } from "./utils";
import { useBrewInstalled } from "./hooks/useBrewInstalled";
import { isInstalled } from "./hooks/useBrewSearch";
import { FormulaList } from "./components/list";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { ErrorBoundary } from "./components/ErrorBoundary";

function InstalledContent() {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const { isLoading, data: installed, revalidate } = useBrewInstalled();

  let formulae: Formula[] = [];
  if (filter != InstallableFilterType.casks && installed?.formulae instanceof Map) {
    formulae = Array.from(installed.formulae.values());
  }
  let casks: Cask[] = [];
  if (filter != InstallableFilterType.formulae && installed?.casks instanceof Map) {
    casks = Array.from(installed.casks.values());
  }

  // Log rendering statistics
  if (installed && !isLoading) {
    uiLogger.log("Installed view rendered", {
      filter,
      formulaeDisplayed: formulae.length,
      casksDisplayed: casks.length,
      totalDisplayed: formulae.length + casks.length,
      totalAvailable: (installed.formulae?.size ?? 0) + (installed.casks?.size ?? 0),
    });
  }

  // Determine search bar placeholder based on loading state
  const searchBarPlaceholder = isLoading ? "Loading installed packages…" : placeholder(filter);

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={isLoading}
      dataFetched={installed !== undefined}
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
