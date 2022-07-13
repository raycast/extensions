import {Action, ActionPanel, List} from "@raycast/api";
import AccountsListByEmail from "./AccountsListByEmail";
import {ItemProps} from "./PrepareList";

export default function EmailItem({tenant, query}: ItemProps) {
  return <List.Item
    title="Find By Email"
    subtitle={query ? `${query} ➡️` : 'Please start entering an email'}
    actions={
      <ActionPanel>
        {query.length > 0 && <Action.Push
          title="Find"
          target={<AccountsListByEmail tenant={tenant} email={query}/>}
        />}
      </ActionPanel>
    }
  />
}