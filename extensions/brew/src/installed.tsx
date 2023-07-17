import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchInstalled } from "./brew";
import { FormulaList } from "./components/list";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";

export default function Main(): JSX.Element {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const { isLoading, data, revalidate } = useCachedPromise(() => brewFetchInstalled(true));

  const formulae = filter != InstallableFilterType.casks ? data?.formulae ?? [] : [];
  const casks = filter != InstallableFilterType.formulae ? data?.casks ?? [] : [];

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={isLoading}
      onAction={() => revalidate()}
    />
  );
}
