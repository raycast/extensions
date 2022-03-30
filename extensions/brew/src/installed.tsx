import { useEffect, useState } from "react";
import { showFailureToast } from "./utils";
import { InstallableResults, brewFetchInstalled } from "./brew";
import { FormulaList } from "./components/list";

interface State {
  results?: InstallableResults;
  isLoading: boolean;
}

export default function Main(): JSX.Element {
  const [state, setState] = useState<State>({ isLoading: true });

  useEffect(() => {
    if (!state.isLoading) {
      return;
    }

    brewFetchInstalled(true)
      .then((results) => {
        setState({ results: results, isLoading: false });
      })
      .catch((err) => {
        showFailureToast("Brew list failed", err);
        setState({ isLoading: false });
      });
  }, [state]);

  const formulae = state.results?.formulae ?? [];
  const casks = state.results?.casks ?? [];

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder="Filter results by name"
      isLoading={state.isLoading}
      onAction={() => {
        setState((oldState) => ({ ...oldState, isLoading: true }));
      }}
    />
  );
}
