import { useState } from "react";
import { State } from "./types";
import { ActionPanel, Detail, List, PushAction } from "@raycast/api";
import { inferType } from "./util";
import { Actions } from "./actions";

export function SlowEval() {
  const [state, setState] = useState<State>({ isLoading: false });
  return (
    <List
      searchBarPlaceholder="Type some Javascript to Evaluate and press return"
      isLoading={false}
      onSearchTextChange={(query: string) => {
        setState((oldState) => ({ ...oldState, query: query, isLoading: false }));
      }}
    >
      {(state?.query?.length ?? 0) === 0 ? null : (
        <List.Item
          title={`Evaluate: ${state?.query}`}
          accessoryTitle="⏎  to evaluate"
          actions={
            <ActionPanel title="Evaluation result">
              <PushAction title="Show Evaluation" icon="command-icon.png" target={<EvalResult state={state} />} />
            </ActionPanel>
          }
          icon="command-icon.png"
        />
      )}
    </List>
  );
}

function EvalResult(props: { state: State }): JSX.Element {
  const { state } = props;
  let result;
  let error;
  try {
    result = eval(state.query?.trim() ?? "");
  } catch (err) {
    if (err instanceof Error) {
      error = err.message;
    } else if (typeof err === "string") {
      error = err;
    }
  }

  return (
    <Detail
      markdown={`### Code:
\`\`\`
${state.query}
\`\`\`

${error ? "Evaluation Error:" : `Evaluation result (\`${inferType(result)}\`):`}

\`\`\`
${error ?? JSON.stringify(result, null, 2)}
\`\`\`
            `}
      actions={<Actions state={state} />}
    />
  );
}
