/**
 * Transaction list component for displaying account transactions.
 */

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { getPayments, type MonetaryAccount, type Payment } from "../../api/endpoints";
import { ErrorView } from "../../components";
import { formatCurrency } from "../../lib/formatters";
import { getBalanceColor } from "../../lib/status-helpers";
import { getErrorMessage } from "../../lib/errors";
import { copyToClipboard } from "../../lib/actions";
import { getPaymentCounterparty } from "./account-helpers";
import { PaymentNotesView } from "./PaymentNotesView";

type TransactionFilter = "all" | "incoming" | "outgoing";

interface TransactionListProps {
  account: MonetaryAccount;
  session: ReturnType<typeof useBunqSession>;
}

export function TransactionList({ account, session }: TransactionListProps) {
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const {
    data: paymentsResult,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return { items: [], pagination: null };
      return withSessionRefresh(session, () =>
        getPayments(session.userId!, account.id, session.getRequestOptions(), { count: 100 }),
      );
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const payments = paymentsResult?.items ?? [];

  if (error) {
    return (
      <ErrorView
        title="Error Loading Transactions"
        message={getErrorMessage(error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  const filteredPayments = payments.filter((payment) => {
    if (filter === "all") return true;
    const isIncoming = parseFloat(payment.amount.value) > 0;
    return filter === "incoming" ? isIncoming : !isIncoming;
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${account.description} - Transactions`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter transactions" value={filter} onChange={(v) => setFilter(v as TransactionFilter)}>
          <List.Dropdown.Item title="All Transactions" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="Incoming" value="incoming" icon={Icon.ArrowDown} />
          <List.Dropdown.Item title="Outgoing" value="outgoing" icon={Icon.ArrowUp} />
        </List.Dropdown>
      }
    >
      {filteredPayments.length === 0 && (
        <List.EmptyView
          icon={Icon.Receipt}
          title="No Transactions"
          description={filter === "all" ? "This account has no transactions yet" : `No ${filter} transactions`}
        />
      )}
      {filteredPayments.map((payment) => (
        <TransactionListItem key={payment.id} payment={payment} account={account} session={session} />
      ))}
    </List>
  );
}

interface TransactionListItemProps {
  payment: Payment;
  account: MonetaryAccount;
  session: ReturnType<typeof useBunqSession>;
}

function TransactionListItem({ payment, account, session }: TransactionListItemProps) {
  const { push } = useNavigation();
  const amount = formatCurrency(payment.amount.value, payment.amount.currency);
  const isIncoming = parseFloat(payment.amount.value) > 0;
  const counterparty = getPaymentCounterparty(payment);
  // Only show subtitle if description exists and is different from the title
  const subtitle = payment.description && payment.description !== counterparty ? payment.description : "";

  return (
    <List.Item
      title={counterparty}
      subtitle={subtitle}
      accessories={[
        { date: new Date(payment.created), tooltip: "Transaction date" },
        {
          text: { value: isIncoming ? `+${amount}` : amount, color: getBalanceColor(payment.amount.value) },
          tooltip: isIncoming ? "Received" : "Sent",
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="View Notes"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<PaymentNotesView account={account} payment={payment} session={session} />)}
          />
          <Action
            title="Copy Amount"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(payment.amount.value, "amount")}
          />
          <Action
            title="Copy Description"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(payment.description || "", "description")}
          />
        </ActionPanel>
      }
    />
  );
}
