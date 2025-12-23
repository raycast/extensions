import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { State } from "./types";
import { doEval } from "./util";
import { Actions } from "./actions";

export function FastEval() {
  const [state, setState] = useState<State>({ query: "", result: "", type: "" });

  useEffect(() => {
    const newState = doEval(state);
    setState(newState);
  }, [state.query]);

  return (
    <List
      searchBarPlaceholder="Type some Javascript to Evaluate"
      onSearchTextChange={(query: string) => {
        setState((oldState) => ({ ...oldState, query: query }));
      }}
    >
      {(state?.query?.length ?? 0) === 0 ? null : (
        <List.Item
          title={state?.result ?? "undefined"}
          subtitle={state?.type ?? "undefined"}
          accessories={[{ text: "JS Evaluation" }]}
          actions={<Actions state={state} />}
          icon="command-icon.png"
        />
      )}
    </List>
  );
}
