import { useEffect, useRef, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchInstalled, brewSearch, Cask, Formula, InstallableResults, InstalledMap } from "./brew";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { FormulaList } from "./components/list";

/// Main

type Installable = Cask | Formula;

export default function Main(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState(InstallableFilterType.all);

  const {
    isLoading: isLoadingInstalled,
    data: installed,
    revalidate: revalidateInstalled,
  } = useCachedPromise(() => brewFetchInstalled(true));

  const latestInstalled = useRef(installed);
  latestInstalled.current = installed;

  const abortable = useRef<AbortController>();
  const {
    isLoading: isLoadingSearch,
    data: results,
    mutate,
  } = useCachedPromise(
    (query) =>
      brewSearch(query, 200).then((results) => {
        updateInstalled(results, latestInstalled.current);
        return results;
      }),
    [searchText],
    { abortable, keepPreviousData: true },
  );

  // when the installed casks and formulaes have been fetched, we update the results
  // to show if they are installed
  useEffect(() => {
    mutate(undefined, {
      optimisticUpdate(data) {
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
      onSearchTextChange={(searchText) => setSearchText(searchText.trim())}
      isInstalled={(name) => {
        return isInstalled(name, installed);
      }}
      onAction={() => revalidateInstalled()}
    />
  );
}

/// Private

function updateInstalled(results?: InstallableResults, installed?: InstalledMap) {
  if (!results || !installed) {
    return;
  }

  for (const formula of results.formulae) {
    const info = installed.formulae instanceof Map ? installed.formulae.get(formula.name) : undefined;
    if (info && isFormula(info)) {
      formula.installed = info.installed;
      formula.outdated = info.outdated;
      formula.pinned = info.pinned;
    } else {
      formula.installed = [];
      formula.outdated = false;
      formula.pinned = false;
    }
  }

  for (const cask of results.casks) {
    const info = installed.casks instanceof Map ? installed.casks.get(cask.token) : undefined;
    if (info && isCask(info)) {
      cask.installed = info.installed;
      cask.outdated = info.outdated;
    } else {
      cask.installed = undefined;
      cask.outdated = false;
    }
  }
}

function isCask(installable: Installable): installable is Cask {
  return (installable as Cask).token != undefined;
}

function isFormula(installable: Installable): installable is Formula {
  return (installable as Formula).pinned != undefined;
}

function isInstalled(name: string, installed?: InstalledMap): boolean {
  if (!installed) {
    return false;
  }
  return (
    (installed.formulae instanceof Map && installed.formulae.get(name) != undefined) ||
    (installed.casks instanceof Map && installed.casks.get(name) != undefined)
  );
}
