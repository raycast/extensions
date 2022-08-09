import { State } from "./types";
import { ActionPanel, Action } from "@raycast/api";

export function Actions(props: { state: State }) {
  return (
    <ActionPanel title="Evaluation Result">
      <ActionPanel.Section>
        {props.state?.result && (
          <Action.CopyToClipboard title="Copy Result to Clipboard" content={props.state.result} />
        )}
        {props.state?.query && <Action.CopyToClipboard title="Copy Code to Clipboard" content={props.state.query} />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
