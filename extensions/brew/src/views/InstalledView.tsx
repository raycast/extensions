/**
 * Installed view for displaying installed brew packages.
 */

import React, { useState } from "react";
import { Cask, Formula, uiLogger } from "../utils";
import { useBrewInstalled } from "../hooks/useBrewInstalled";
import { FormulaList } from "../components/list";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "../components/filter";
import { ErrorBoundary } from "../components/ErrorBoundary";

function InstalledViewContent() {
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

  const isInstalled = (name: string) => {
    if (!installed) {
      return false;
    }
    return (
      (installed.formulae instanceof Map && installed.formulae.get(name) != undefined) ||
      (installed.casks instanceof Map && installed.casks.get(name) != undefined)
    );
  };

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

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={isLoading}
      isInstalled={isInstalled}
      onAction={() => {
        uiLogger.log("Revalidating installed packages");
        revalidate();
      }}
    />
  );
}

export default function InstalledView() {
  return (
    <ErrorBoundary>
      <InstalledViewContent />
    </ErrorBoundary>
  );
}
