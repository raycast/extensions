import { Action, ActionPanel, List } from "@raycast/api";
import AccountsListByCode from "./AccountsListByCode";
import { ItemProps } from "./PrepareList";

// noinspection JSUnusedGlobalSymbols
export default function CodeItem({ tenant, query }: ItemProps) {
  return (
    <List.Item
      title="Find By Code"
      subtitle={query ? `${query} ➡️` : "Please input a code"}
      actions={
        <ActionPanel>
          {query.length > 0 && (
            <Action.Push title="Find" target={<AccountsListByCode tenant={tenant} code={`code-${query}`} />} />
          )}
        </ActionPanel>
      }
    />
  );
}
