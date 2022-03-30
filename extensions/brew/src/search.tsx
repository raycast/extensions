import { useEffect, useState } from "react";
import { showFailureToast } from "./utils";
import { Cask, Formula, InstallableResults } from "./brew";
import { brewSearch, brewFetchInstalled } from "./brew";
import { FormulaList } from "./components/list";

/// Main

type Installable = Cask | Formula;

interface Installed {
  formulae: Map<string, Formula>;
  casks: Map<string, Cask>;
}

interface State {
  isLoading: boolean;
  results?: InstallableResults;
  installed?: Installed;
  query?: string;
}

export default function Main(): JSX.Element {
  const [state, setState] = useState<State>({ isLoading: true });

  useEffect(() => {
    if (!state.isLoading) {
      return;
    }

    if (state.installed == undefined) {
      listInstalled()
        .then((installed: Installed) => {
          setState((oldState) => ({ ...oldState, installed: installed }));
        })
        .catch((err) => {
          console.log("listInstalled error:", err);
          showFailureToast("Brew search failed", err);
        });
      return;
    }

    const query = state.query?.trim() ?? "";
    brewSearch(query, 200)
      .then((results) => {
        updateInstalled(results, state.installed);
        setState((oldState) => ({ ...oldState, results: results, isLoading: false }));
      })
      .catch((err) => {
        showFailureToast("Brew search failed", err);
        setState((oldState) => ({ ...oldState, results: undefined, isLoading: false }));
      });
  }, [state]);

  const formulae = state.results?.formulae ?? [];
  const casks = state.results?.casks ?? [];

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={"Search formulae by name" + String.ellipsis}
      isLoading={state.isLoading}
      onSearchTextChange={(query: string) => {
        // Perhaps query should be another useState??
        setState((oldState) => ({ ...oldState, query: query, isLoading: true }));
      }}
      onAction={() => {
        setState((oldState) => ({ ...oldState, installed: undefined, isLoading: true }));
      }}
    />
  );
}

/// Private

async function listInstalled(): Promise<Installed> {
  const installed = await brewFetchInstalled(true);

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
