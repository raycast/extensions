import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { useAccountsWithRecents, useTasksByAccount, useCurrentUser, useAuthErrorHandler } from "./hooks";
import { TaskListItem, TaskFilterDropdown } from "./components";
import { Account } from "./api";
import { StatusFilter, TypeFilter, filterTasks, getFilterDescription, sortTasksByCreatedDate } from "./utils";

export default function SearchByAccountCommand() {
  const { error: userError } = useCurrentUser();
  const { data: accounts, recentIds, isLoading: isLoadingAccounts } = useAccountsWithRecents();

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Handle auth errors
  useAuthErrorHandler(userError);

  if (selectedAccountId) {
    return (
      <AccountTasksList
        accountId={selectedAccountId}
        accountName={accounts?.find((a) => a.id === selectedAccountId)?.name || "Account"}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onFilterChange={(status, type) => {
          setStatusFilter(status);
          setTypeFilter(type);
        }}
        onBack={() => setSelectedAccountId("")}
      />
    );
  }

  return (
    <List isLoading={isLoadingAccounts} searchBarPlaceholder="Search accounts...">
      {recentIds.length > 0 && (
        <List.Section title="Recent">
          {accounts
            ?.filter((a) => recentIds.includes(a.id))
            .map((account) => (
              <AccountListItem key={account.id} account={account} onSelect={() => setSelectedAccountId(account.id)} />
            ))}
        </List.Section>
      )}
      <List.Section title="All Accounts">
        {accounts
          ?.filter((a) => !recentIds.includes(a.id))
          .map((account) => (
            <AccountListItem key={account.id} account={account} onSelect={() => setSelectedAccountId(account.id)} />
          ))}
      </List.Section>
    </List>
  );
}

interface AccountListItemProps {
  account: Account;
  onSelect: () => void;
}

function AccountListItem({ account, onSelect }: AccountListItemProps) {
  return (
    <List.Item
      title={account.name}
      subtitle={account.domain}
      icon={account.logo_url || Icon.Building}
      actions={
        <ActionPanel>
          <Action title="View Tasks" onAction={onSelect} />
        </ActionPanel>
      }
    />
  );
}

interface AccountTasksListProps {
  accountId: string;
  accountName: string;
  statusFilter: StatusFilter;
  typeFilter: TypeFilter;
  onFilterChange: (status: StatusFilter, type: TypeFilter) => void;
  onBack: () => void;
}

function AccountTasksList({
  accountId,
  accountName,
  statusFilter,
  typeFilter,
  onFilterChange,
  onBack,
}: AccountTasksListProps) {
  const { data: tasks, isLoading, revalidate } = useTasksByAccount(accountId);

  const filters = { status: statusFilter, type: typeFilter };
  const filteredTasks = sortTasksByCreatedDate(filterTasks(tasks, filters));

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Tasks for ${accountName}`}
      searchBarPlaceholder={`Search tasks for ${accountName}...`}
      searchBarAccessory={<TaskFilterDropdown onFilterChange={onFilterChange} />}
    >
      {!isLoading && filteredTasks.length === 0 ? (
        <List.EmptyView
          title="No tasks found"
          description={getFilterDescription(filters, accountName)}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
      ) : (
        filteredTasks.map((task) => <TaskListItem key={task.id} task={task} onStatusChange={revalidate} />)
      )}
    </List>
  );
}
