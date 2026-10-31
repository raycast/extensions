import { Action, Icon, LaunchProps, closeMainWindow, Keyboard } from "@raycast/api";
import { useCallback } from "react";
import { bolt, showBoltFailure } from "./bolt";
import { ResultView } from "./result-view";

export default function Command(props: LaunchProps<{ arguments: Arguments.Ask }>) {
  const prompt = props.arguments.prompt;
  const run = useCallback((signal: AbortSignal) => bolt(["ask", "--", prompt], { signal }), [prompt]);

  return (
    <ResultView
      navigationTitle={prompt}
      run={run}
      actions={
        <Action
          title="Ask in a BoltAI Chat"
          icon={Icon.Message}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={async () => {
            try {
              await bolt(["chat", "new", "--", prompt]);
              await closeMainWindow();
            } catch (error) {
              await showBoltFailure(error);
            }
          }}
        />
      }
    />
  );
}
