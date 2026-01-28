import { useEffect, useState } from "react";
import { List, ActionPanel, Detail, Action } from "@raycast/api";
import { State } from "./types";
import { doEval } from "./util";
import { Actions } from "./actions";

export function SlowEval() {
  const [state, setState] = useState<State>({ query: "", result: "", markdownResult: "" });

  useEffect(() => {
    const newState = doEval(state);
    setState(newState);
  }, [state.query]);

  return (
    <List
      searchBarPlaceholder="Type some Ruby code to Evaluate"
      isShowingDetail
      onSearchTextChange={(query: string) => {
        setState((oldState) => ({ ...oldState, query: query }));
      }}
    >
      {(state?.query?.length ?? 0) === 0 ? null : (
        <List.Item
          title={`Evaluate: ${state?.query}`}
          accessoryTitle="⏎  to evaluate"
          actions={
            <ActionPanel title="Evaluation result">
              <Action.Push title="Show Evaluation" icon="command-icon.png" target={<EvalResult state={state} />} />
            </ActionPanel>
          }
          icon="command-icon.png"
        />
      )}
    </List>
  );
}

function EvalResult(props: { state: State }): JSX.Element {
  const newState = doEval(props.state);
  return <Detail markdown={newState.markdownResult} actions={<Actions state={newState} />} />;
}
