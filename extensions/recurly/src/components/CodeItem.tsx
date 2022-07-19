import { Action, ActionPanel, List } from "@raycast/api";
import AccountsListByCode from "./AccountsListByCode";
import { ItemProps } from "./PrepareList";

export default function UseCodeItem(): [string, (props: ItemProps) => JSX.Element] {
  return [
    "Search by Account Code",
    function CodeItem({ tenant, query }: ItemProps) {
      return (
        <List.Item
          title="Code:"
          subtitle={`${query} ➡️`}
          actions={
            <ActionPanel>
              {query.length > 0 && (
                <Action.Push title="Find" target={<AccountsListByCode tenant={tenant} code={`code-${query}`} />} />
              )}
            </ActionPanel>
          }
        />
      );
    },
  ];
}
