import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { renderComparison } from "./lib/compare";

export function CompareDetail(props: {
  original: string;
  result: string;
  incompleteReason?: string;
}) {
  return (
    <Detail
      navigationTitle="Compare with Original"
      markdown={
        props.incompleteReason
          ? `**Response may be incomplete:** ${props.incompleteReason}\n\n${renderComparison(props.original, props.result)}`
          : renderComparison(props.original, props.result)
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Enhanced Text"
            content={props.result}
          />
          <Action.Paste title="Paste Enhanced Text" content={props.result} />
          <Action.CopyToClipboard
            title="Copy Original Draft"
            content={props.original}
            icon={Icon.Clipboard}
          />
        </ActionPanel>
      }
    />
  );
}
