import { State } from "./types";
import { ActionPanel, CopyToClipboardAction } from "@raycast/api";

export function Actions(props: { state: State }) {
  return (
    <ActionPanel title="Evaluation result">
      <ActionPanel.Section>
        {props.state?.result && <CopyToClipboardAction title="Copy Result to Clipboard" content={props.state.result} />}
        {props.state?.query && <CopyToClipboardAction title="Copy Code to Clipboard" content={props.state.query} />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
