import { Action, ActionPanel, List } from "@raycast/api";
import AccountsListByEmail from "./AccountsListByEmail";
import { ItemProps } from "./PrepareList";

export default function UseEmailItem(): [string, (props: ItemProps) => JSX.Element] {

  return [
    "Search by Email",
    ({ tenant, query }: ItemProps) =>
    (
      <List.Item
        title="Email:"
        subtitle={`${query} ➡️`}
        actions={
          <ActionPanel>
            {query.length > 0 && (
              <Action.Push title="Find" target={<AccountsListByEmail tenant={tenant} email={query} />} />
            )}
          </ActionPanel>
        }
      />
    )
  ];
}
