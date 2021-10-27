import { showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { Formula, brewFetchInstalled } from "./brew";
import { FormulaList } from "./components/list";

interface State {
  formulae: Formula[];
  isLoading: boolean;
}

export default function Main() {
  const [state, setState] = useState<State>({formulae: [], isLoading: true});

  useEffect(() => {
    if (!state.isLoading) { return; }
    brewFetchInstalled(true)
      .then(formulae => {
        setState({formulae: formulae, isLoading: false});
      })
      .catch(err => {
        console.log("brewFetchInstalled error:", err);
        showToast(ToastStyle.Failure, "Brew list failed");
        setState({formulae: [], isLoading: false});
      });
  }, [state]);

  return (
    <FormulaList formulae={state.formulae}
                 searchBarPlaceholder="Filter formulae by name"
                 sectionTitle="Installed"
                 isLoading={state.isLoading}
                 onAction={() => {
                   setState((oldState) => ({ ...oldState, isLoading: true}));
                 }}
    />
  );
}
