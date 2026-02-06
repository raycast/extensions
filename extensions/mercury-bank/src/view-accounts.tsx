import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { AccountListItem } from "./components/AccountListItem";
import { useAccounts } from "./lib/hooks/useAccounts";
import { formatCurrency } from "./lib/utils";

export default function ViewAccounts() {
  return (
    <FeatureGuard feature="accounts">
      {(apiKey, accountName) => (
        <AccountsList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function AccountsList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: accounts, isLoading, error } = useAccounts(apiKey);
  const [showDetail, setShowDetail] = useState(true);
  const toggleDetail = () => setShowDetail((v) => !v);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load accounts",
        message: String(error),
      });
    }
  }, [error]);

  const totalBalance = (accounts ?? [])
    .filter((a) => a.status === "active")
    .reduce((sum, a) => sum + (a.availableBalance ?? 0), 0);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search accounts..."
    >
      <List.EmptyView
        title={error ? "Failed to Load" : "No Accounts"}
        description={error ? String(error) : "No bank accounts found"}
      />
      <List.Section
        title="Accounts"
        subtitle={
          accounts && accounts.length > 0
            ? `Total: ${formatCurrency(totalBalance)}`
            : undefined
        }
      >
        {(accounts ?? []).map((account) => (
          <AccountListItem
            key={account.id}
            account={account}
            apiKey={apiKey}
            accountName={accountName}
            showDetail={showDetail}
            toggleDetail={toggleDetail}
          />
        ))}
      </List.Section>
    </List>
  );
}