import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import { AccountSwitcherActions } from "./components/AccountSwitcher";
import { useAccounts } from "./lib/hooks/useAccounts";
import { useStatements } from "./lib/hooks/useStatements";
import { formatDate, formatCurrency } from "./lib/utils";

export default function ViewStatements() {
  return (
    <FeatureGuard feature="statements">
      {(apiKey, accountName) => (
        <StatementsList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function StatementsList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: accounts } = useAccounts(apiKey);
  const activeAccounts = (accounts ?? []).filter((a) => a.status === "active");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const accountId = selectedAccountId || activeAccounts[0]?.id;
  const { data: statements, isLoading } = useStatements(apiKey, accountId);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search statements..."
      searchBarAccessory={
        activeAccounts.length > 1 ? (
          <List.Dropdown
            tooltip="Select Account"
            onChange={setSelectedAccountId}
          >
            {activeAccounts.map((account) => (
              <List.Dropdown.Item
                key={account.id}
                title={account.nickname ?? account.name}
                value={account.id}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {!isLoading && statements && statements.length === 0 && (
        <EmptyView
          title="No Statements"
          description="No statements available"
          icon={Icon.Document}
        />
      )}
      <List.Section
        title="Statements"
        subtitle={`${(statements ?? []).length} statements`}
      >
        {(statements ?? []).map((statement) => (
          <List.Item
            key={statement.id}
            title={`${formatDate(statement.startDate)} - ${formatDate(statement.endDate)}`}
            subtitle={statement.companyLegalName}
            icon={Icon.Document}
            accessories={[{ text: formatCurrency(statement.endingBalance) }]}
            actions={
              <ActionPanel>
                {statement.downloadUrl && (
                  <Action.OpenInBrowser
                    title="Download Pdf"
                    url={statement.downloadUrl}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Statement Id"
                  content={statement.id}
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