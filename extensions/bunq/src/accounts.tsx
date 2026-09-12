/**
 * Accounts command for viewing and managing bunq monetary accounts.
 */

import { Action, ActionPanel, List, Icon, Color, useNavigation } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { useAccounts } from "./hooks/useAccounts";
import { getPayments, getUsers } from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ErrorView } from "./components";
import { formatCurrency } from "./lib/formatters";
import { getBalanceColor } from "./lib/status-helpers";
import { getErrorMessage } from "./lib/errors";
import { copyToClipboard } from "./lib/actions";
import { requireUserId } from "./lib/session-guard";
import {
  TransactionList,
  SpendingInsights,
  ExportStatementForm,
  AccountDetailMetadata,
  CancelledAccountsList,
  getAccountTypeLabel,
  groupAccountsByType,
} from "./components/accounts";

// ============== Main Command ==============

export default function AccountsCommand() {
  const session = useBunqSession();
  const { push } = useNavigation();
  const { accounts, isLoading: accountsLoading, error: accountsError, revalidate } = useAccounts(session);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Fetch all users the API key has access to (for debugging multi-user access)
  usePromise(
    async () => {
      if (!session.sessionToken) return [];
      return getUsers(session.getRequestOptions());
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const activeAccounts = accounts?.filter((a) => a.status !== "CANCELLED") || [];
  const cancelledAccounts = accounts?.filter((a) => a.status === "CANCELLED") || [];

  const selectedAccount = activeAccounts.find((a) => a.id.toString() === selectedAccountId);

  // Fetch recent payments for selected account (for detail view)
  const isValidAccountId = selectedAccountId && !isNaN(parseInt(selectedAccountId, 10));
  const { data: recentPaymentsResult, isLoading: isLoadingPayments } = usePromise(
    async (accountId: string | null) => {
      if (!session.userId || !session.sessionToken || !accountId) return { items: [], pagination: null };
      const userId = requireUserId(session);
      return withSessionRefresh(session, () =>
        getPayments(userId, parseInt(accountId, 10), session.getRequestOptions(), { count: 10 }),
      );
    },
    [selectedAccountId],
    { execute: session.isConfigured && !session.isLoading && !!isValidAccountId },
  );

  const recentPayments = recentPaymentsResult?.items;

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || accountsError) {
    const error = session.error || accountsError;
    return (
      <ErrorView
        title="Error Loading Accounts"
        message={getErrorMessage(error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  const groupedAccounts = groupAccountsByType(activeAccounts);

  return (
    <List isLoading={accountsLoading} isShowingDetail onSelectionChange={(id) => setSelectedAccountId(id || null)}>
      {Array.from(groupedAccounts.entries()).map(([accountType, accountsInGroup]) => (
        <List.Section key={accountType} title={getAccountTypeLabel(accountType)}>
          {accountsInGroup.map((account) => {
            const balance = formatCurrency(account.balance.value, account.balance.currency);
            const iban = account.alias.find((a) => a.type === "IBAN")?.value || "";

            return (
              <List.Item
                key={account.id}
                id={account.id.toString()}
                title={account.description}
                accessories={[
                  { text: { value: balance, color: getBalanceColor(account.balance.value) }, tooltip: "Balance" },
                ]}
                detail={
                  selectedAccount?.id === account.id ? (
                    <AccountDetailMetadata
                      account={account}
                      recentPayments={recentPayments}
                      isLoadingPayments={isLoadingPayments}
                    />
                  ) : undefined
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="View All Transactions"
                        icon={Icon.List}
                        onAction={() => push(<TransactionList account={account} session={session} />)}
                      />
                      <Action
                        title="Spending Insights"
                        icon={Icon.BarChart}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                        onAction={() => push(<SpendingInsights account={account} session={session} />)}
                      />
                      <Action
                        title="Export Statement"
                        icon={Icon.Document}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={() => push(<ExportStatementForm account={account} session={session} />)}
                      />
                    </ActionPanel.Section>
                    {iban && (
                      <ActionPanel.Section>
                        <Action
                          title="Copy IBAN"
                          icon={Icon.Clipboard}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                          onAction={() => copyToClipboard(iban, "IBAN")}
                        />
                      </ActionPanel.Section>
                    )}
                    <ActionPanel.Section>
                      <Action
                        title="Reset Connection"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        onAction={session.reconnect}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {cancelledAccounts.length > 0 && (
        <List.Item
          id="cancelled-accounts"
          title="Cancelled"
          subtitle={`${cancelledAccounts.length} account${cancelledAccounts.length !== 1 ? "s" : ""}`}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="View Cancelled Accounts"
                icon={Icon.List}
                onAction={() => push(<CancelledAccountsList accounts={cancelledAccounts} session={session} />)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
