import { useEffect, useState } from "react";
import { showFailureToast } from "./utils";
import { InstallableResults, brewFetchInstalled } from "./brew";
import { FormulaList } from "./components/list";
import { InstallableFilterDropdown, InstallableFilterType } from "./components/filter";

interface State {
  results?: InstallableResults;
  isLoading: boolean;
  filter: InstallableFilterType;
}

export default function Main(): JSX.Element {
  const [state, setState] = useState<State>({ isLoading: true, filter: InstallableFilterType.all });

  useEffect(() => {
    if (!state.isLoading) {
      return;
    }

    brewFetchInstalled(true)
      .then((results) => {
        setState((oldState) => ({ ...oldState, results: results, isLoading: false }));
      })
      .catch((err) => {
        showFailureToast("Brew list failed", err);
        setState((oldState) => ({ ...oldState, isLoading: false }));
      });
  }, [state]);

  const formulae = state.filter != InstallableFilterType.casks ? state.results?.formulae ?? [] : [];
  const casks = state.filter != InstallableFilterType.formulae ? state.results?.casks ?? [] : [];

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder="Filter results by name"
      searchBarAccessory={
        <InstallableFilterDropdown
          onSelect={(filterType) => {
            if (state.filter != filterType) {
              setState((oldState) => ({ ...oldState, filter: filterType }));
            }
          }}
        />
      }
      isLoading={state.isLoading}
      onAction={() => {
        setState((oldState) => ({ ...oldState, isLoading: true }));
      }}
    />
  );
}
