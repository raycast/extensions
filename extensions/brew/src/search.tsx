/**
 * Search command for browsing and searching brew packages.
 */

import { useState } from "react";
import { useBrewInstalled } from "./hooks/useBrewInstalled";
import { useBrewSearch, isInstalled } from "./hooks/useBrewSearch";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { FormulaList } from "./components/list";

export default function Main() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState(InstallableFilterType.all);

  const { isLoading: isLoadingInstalled, data: installed, revalidate: revalidateInstalled } = useBrewInstalled();

  // useBrewSearch automatically applies installed status via useMemo
  // whenever either search results or installed data changes
  const { isLoading: isLoadingSearch, data: results } = useBrewSearch({ searchText, installed });

  const formulae = filter != InstallableFilterType.casks ? (results?.formulae ?? []) : [];
  const casks = filter != InstallableFilterType.formulae ? (results?.casks ?? []) : [];

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={isLoadingInstalled || isLoadingSearch}
      onSearchTextChange={(searchText) => setSearchText(searchText.trim())}
      filtering={false}
      isInstalled={(name) => isInstalled(name, installed)}
      onAction={() => revalidateInstalled()}
    />
  );
}
