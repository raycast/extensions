import { useState } from "react";
import { State } from "./types";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { doEval } from "./util";
import { Actions } from "./actions";

export function SlowEval() {
  const [state, setState] = useState<State>({ query: "", result: "", type: "" });
  return (
    <List
      searchBarPlaceholder="Type some Javascript to Evaluate and press return"
      onSearchTextChange={(query: string) => {
        setState((oldState) => ({ ...oldState, query: query }));
      }}
    >
      {(state?.query?.length ?? 0) === 0 ? null : (
        <List.Item
          title={`Evaluate: ${state?.query}`}
          accessories={[{ text: "⏎  to evaluate" }]}
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
  const newState = doEval(props.state, true);

  const markdown = `
  ### Code:
  \`\`\`
  ${newState.query}
  \`\`\`
  
  ### Evaluation:
  \`\`\`
  ${newState?.result ?? "undefined"}
  \`\`\`
  
  ### Type:
  \`\`\`
  ${newState?.type ?? "undefined"}
  \`\`\`
  `;

  return <Detail markdown={markdown} actions={<Actions state={newState} />} />;
}
