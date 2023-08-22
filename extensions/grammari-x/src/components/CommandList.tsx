import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { CommandType } from "../types";

const fixGrammerCommandIcon = { source: Icon.Check, tintColor: Color.Green };
const rewriteCommandIcon = { source: Icon.Pencil, tintColor: Color.Blue };

export default function CommandList({
  onExecute,
  searchText,
}: {
  onExecute: (command: CommandType) => void;
  searchText: string;
}) {
  return (
    <>
      {searchText ? (
        <List.Section title="Commands">
          <List.Item
            title="Fix grammer"
            icon={fixGrammerCommandIcon}
            actions={
              <ActionPanel>
                <Action title="Fix Grammer" onAction={async () => await onExecute(CommandType.Fix)} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Rewrite"
            icon={rewriteCommandIcon}
            actions={
              <ActionPanel>
                <Action title="Rewrite" onAction={async () => await onExecute(CommandType.Rewrite)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <List.EmptyView icon={Icon.Code} title="Type something to fix grammer" />
      )}
    </>
  );
}
