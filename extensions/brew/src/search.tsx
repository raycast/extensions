import { useEffect, useMemo, useRef, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchInstalled, brewSearch, Cask, Formula, InstallableResults } from "./brew";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { FormulaList } from "./components/list";

/// Main

type Installable = Cask | Formula;

interface Installed {
  formulae: Map<string, Formula>;
  casks: Map<string, Cask>;
}

export default function Main(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState(InstallableFilterType.all);

  const {
    isLoading: isLoadingInstalled,
    data: _installed,
    revalidate: revalidateInstalled,
  } = useCachedPromise(() => brewFetchInstalled(true));

  const installed = useMemo(() => listInstalled(_installed), [_installed]);

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
    { abortable, keepPreviousData: true }
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

  const formulae = filter != InstallableFilterType.casks ? results?.formulae ?? [] : [];
  const casks = filter != InstallableFilterType.formulae ? results?.casks ?? [] : [];

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={isLoadingInstalled || isLoadingSearch}
      onSearchTextChange={(searchText) => setSearchText(searchText.trim())}
      onAction={() => revalidateInstalled()}
    />
  );
}

/// Private

function listInstalled(installed?: InstallableResults): Installed | undefined {
  if (!installed) {
    return undefined;
  }

  const formulae = new Map<string, Formula>();
  for (const formula of installed.formulae) {
    formulae.set(formula.name, formula);
  }

  const casks = new Map<string, Cask>();
  for (const cask of installed.casks) {
    casks.set(cask.token, cask);
  }

  return { formulae: formulae, casks: casks };
}

function updateInstalled(results?: InstallableResults, installed?: Installed) {
  if (!results || !installed) {
    return;
  }

  for (const formula of results.formulae) {
    const info = installed.formulae.get(formula.name);
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
    const info = installed.casks.get(cask.token);
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
