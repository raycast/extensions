import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import { AccountSwitcherActions } from "./components/AccountSwitcher";
import { useTreasury } from "./lib/hooks/useTreasury";
import { formatCurrency, formatDate } from "./lib/utils";

export default function ViewTreasury() {
  return (
    <FeatureGuard feature="treasury">
      {(apiKey, accountName) => (
        <TreasuryList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function TreasuryList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: treasury, isLoading } = useTreasury(apiKey);
  const accounts = treasury?.accounts ?? [];

  const totalBalance = accounts.reduce((sum, a) => sum + a.availableBalance, 0);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search treasury accounts..."
    >
      {!isLoading && accounts.length === 0 && (
        <EmptyView
          title="No Treasury Accounts"
          description="No treasury accounts found"
          icon={Icon.Building}
        />
      )}
      <List.Section
        title="Treasury"
        subtitle={
          accounts.length > 0
            ? `Total: ${formatCurrency(totalBalance)}`
            : undefined
        }
      >
        {accounts.map((account) => (
          <List.Item
            key={account.id}
            title={account.nickname ?? account.name}
            subtitle={`Created ${formatDate(account.createdAt)}`}
            icon={{ source: Icon.Building, tintColor: Color.Purple }}
            accessories={[
              {
                tag: {
                  value: account.status,
                  color:
                    account.status === "active"
                      ? Color.Green
                      : Color.SecondaryText,
                },
              },
              {
                text: {
                  value: formatCurrency(account.availableBalance),
                  color: Color.Green,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Balance"
                  content={formatCurrency(account.availableBalance)}
                />
                <Action.CopyToClipboard
                  title="Copy Account Id"
                  content={account.id}
                />
                <AccountSwitcherActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}