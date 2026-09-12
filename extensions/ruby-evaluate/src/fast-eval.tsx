import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { State } from "./types";
import { doEval } from "./util";
import { Actions } from "./actions";

export function FastEval() {
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
          title={state.result ?? "undefined"}
          actions={<Actions state={state} />}
          icon="command-icon.png"
          detail={<List.Item.Detail markdown={state.markdownResult ?? "undefined"} />}
        />
      )}
    </List>
  );
}
