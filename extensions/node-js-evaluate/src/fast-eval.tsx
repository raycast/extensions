import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { State } from "./types";
import { inferType } from "./util";
import { Actions } from "./actions";

export function FastEval() {
  const [state, setState] = useState<State>({ isLoading: false });

  useEffect(() => {
    const newState: State = { isLoading: false, query: state.query };

    try {
      const result = eval(state.query?.trim() ?? "");
      newState.result = JSON.stringify(result);
      newState.type = inferType(result);
    } catch (err) {
      newState.error = err instanceof Error ? err : new Error(`Unknown Error: ${err}`);
    }

    setState(newState);
  }, [state.query]);

  return (
    <List
      searchBarPlaceholder="Type some Javascript to Evaluate"
      isLoading={state.isLoading || (!state.result && !state.error)}
      onSearchTextChange={(query: string) => {
        setState((oldState) => ({ ...oldState, query: query, isLoading: true }));
      }}
    >
      {(state?.query?.length ?? 0) === 0 ? null : (
        <List.Item
          title={state?.result ?? state?.error?.message ?? "Unknown Error"}
          subtitle={state?.type}
          accessoryTitle={state?.error?.message ? "Error" : "JS Evaluation"}
          actions={<Actions state={state} />}
          icon="command-icon.png"
        />
      )}
    </List>
  );
}
