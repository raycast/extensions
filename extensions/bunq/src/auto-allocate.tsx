/**
 * Auto Allocation command for managing automatic payment allocations.
 */

import { Action, ActionPanel, List, Icon, Color, useNavigation } from "@raycast/api";
import { useBunqSession } from "./hooks/useBunqSession";
import { useAccounts } from "./hooks/useAccounts";
import { ErrorView } from "./components";
import { formatCurrency } from "./lib/formatters";
import { getErrorMessage } from "./lib/errors";
import { RulesList } from "./components/auto-allocate";

// ============== Main Component ==============

export default function AutoAllocateCommand() {
  const session = useBunqSession();
  const { push } = useNavigation();
  const { accounts, isLoading: accountsLoading, error: accountsError, revalidate } = useAccounts(session);

  if (session.isLoading || accountsLoading) {
    return <List isLoading />;
  }

  if (session.error || accountsError) {
    return (
      <ErrorView
        title="Error Loading Accounts"
        message={getErrorMessage(session.error || accountsError)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  const activeAccounts = accounts?.filter((a) => a.status === "ACTIVE") || [];

  return (
    <List navigationTitle="Auto Allocation">
      <List.Section title="Select Source Account">
        {activeAccounts.map((account) => (
          <List.Item
            key={account.id}
            title={account.description}
            subtitle={`Balance: ${formatCurrency(account.balance.value, account.balance.currency)}`}
            icon={{ source: Icon.Shuffle, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action
                  title="Manage Rules"
                  icon={Icon.List}
                  onAction={() => push(<RulesList sourceAccount={account} session={session} onUpdate={revalidate} />)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Info">
        <List.Item
          title="About Auto Allocation"
          subtitle="Automatically split incoming payments"
          icon={{ source: Icon.QuestionMark, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Learn More" url="https://bunq.com/app" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
