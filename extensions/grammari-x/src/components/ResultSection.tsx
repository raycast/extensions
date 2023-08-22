import { List, ActionPanel, Action } from "@raycast/api";

export default function ResultSection({ output }: { output: string }) {
  return (
    <List.Section title="Result">
      {output ? (
        <List.Item
          title={output}
          detail={<List.Item.Detail markdown={output} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={output} />
            </ActionPanel>
          }
        />
      ) : null}
    </List.Section>
  );
}
