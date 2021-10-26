import { showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { Formula, brewSearchFormula, brewFetchInstalled } from "./brew";
import { FormulaList } from "./components/list";

/// Main

interface State {
  formulae: Formula[];
  isLoading: boolean;
  installed?: Map<string, Formula>;
  query?: string;
}

export default function Main() {
  const [state, setState] = useState<State>({formulae: [], isLoading: true});

  useEffect(() => {
    if (!state.isLoading) { return; }

    if (state.installed == undefined) {
      listInstalled().then((installed: Map<string, Formula>) => {
        setState((oldState) => ({ ...oldState, installed: installed}));
      });
      return;
    }

    brewSearchFormula(state.query?.trim())
      .then(formulae => {
        updateInstalled(formulae, state.installed);
        setState((oldState) => ({...oldState, formulae: formulae, isLoading: false}));
      })
      .catch (err => {
        console.log("brewSearchFormula error:", err);
        setState((oldState) => ({...oldState, formulae: [], isLoading: false}));
        showToast(ToastStyle.Failure, "Package search error");
      });
  }, [state]);

  return (
    <FormulaList formulae={state.formulae}
                 searchBarPlaceholder="Search formulae by name..."
                 isLoading={state.isLoading}
                 onSearchTextChange={(query: string) => {
                   setState((oldState) => ({ ...oldState, query: query}));
                 }}
                 onAction={() => {
                   setState((oldState) => ({ ...oldState, installed: undefined, isLoading: true}));
                 }}
    />
  );
}

/// Private

async function listInstalled(): Promise<Map<string, Formula>> {
  const installed = await brewFetchInstalled(true);
  const dict = new Map<string, Formula>();
  for (const formula of installed) {
    dict.set(formula.name, formula);
  }
  return dict;
}

function updateInstalled(formulae: Formula[], installed?: Map<string, Formula>) {
  if (installed === undefined) { return; }

  for (const formula of formulae) {
    const info = installed.get(formula.name);
    formula.installed = info?.installed ?? [];
    formula.outdated = info?.outdated ?? false;
    formula.pinned = info?.pinned ?? false;
  }
}
