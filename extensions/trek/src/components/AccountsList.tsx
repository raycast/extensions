import { List, ActionPanel, Action } from "@raycast/api";
import ProjectsList from "./ProjectsList";

interface Account {
  id: string;
  name: string;
}

interface AccountsListProps {
  accounts: Account[];
  isLoading: boolean;
}

export function AccountsList({ accounts, isLoading }: AccountsListProps) {
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts...">
      {accounts?.map((account) => (
        <List.Item
          key={account.id}
          title={account.name}
          actions={
            <ActionPanel>
              <Action.Push
                title="Select Account"
                target={<ProjectsList accountId={account.id} accountName={account.name} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
