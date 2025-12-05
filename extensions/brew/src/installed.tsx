import { useState } from "react";
import { Cask, Formula } from "./utils/brew";
import { useBrewInstalled } from "./hooks/useBrewInstalled";
import { FormulaList } from "./components/list";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";

export default function Main() {
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

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={isLoading}
      isInstalled={isInstalled}
      onAction={() => revalidate()}
    />
  );
}
