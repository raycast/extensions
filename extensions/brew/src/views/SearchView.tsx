/**
 * Search view for browsing and searching brew packages.
 */

import React, { useEffect, useState } from "react";
import { InstallableResults } from "../utils";
import { useBrewInstalled } from "../hooks/useBrewInstalled";
import { useBrewSearch, updateInstalled, isInstalled } from "../hooks/useBrewSearch";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "../components/filter";
import { FormulaList } from "../components/list";
import { ErrorBoundary } from "../components/ErrorBoundary";

function SearchViewContent() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState(InstallableFilterType.all);

  const { isLoading: isLoadingInstalled, data: installed, revalidate: revalidateInstalled } = useBrewInstalled();

  const { isLoading: isLoadingSearch, data: results, mutate } = useBrewSearch({ searchText, installed });

  // when the installed casks and formulaes have been fetched, we update the results
  // to show if they are installed
  useEffect(() => {
    mutate(undefined, {
      optimisticUpdate(data: InstallableResults | undefined) {
        updateInstalled(data, installed);
        return data;
      },
      shouldRevalidateAfter: false,
    });
  }, [installed]);

  const formulae = filter != InstallableFilterType.casks ? (results?.formulae ?? []) : [];
  const casks = filter != InstallableFilterType.formulae ? (results?.casks ?? []) : [];

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={isLoadingInstalled || isLoadingSearch}
      onSearchTextChange={(searchText: string) => setSearchText(searchText.trim())}
      isInstalled={(name: string) => {
        return isInstalled(name, installed);
      }}
      onAction={() => revalidateInstalled()}
    />
  );
}

export default function SearchView() {
  return (
    <ErrorBoundary>
      <SearchViewContent />
    </ErrorBoundary>
  );
}
