/**
 * Card transactions list component.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { getMastercardActionsForCard, type Card } from "../../api/endpoints";
import { ErrorView } from "../ErrorView";
import { getCardName } from "./card-helpers";
import { formatCurrency } from "../../lib/formatters";
import { getMastercardActionStatusAppearance, getBalanceColor } from "../../lib/status-helpers";
import { getErrorMessage } from "../../lib/errors";
import { copyToClipboard } from "../../lib/actions";
import { requireUserId } from "../../lib/session-guard";

interface CardTransactionsListProps {
  card: Card;
  session: ReturnType<typeof useBunqSession>;
}

export function CardTransactionsList({ card, session }: CardTransactionsListProps) {
  const accountId = card.pin_code_assignment?.[0]?.monetary_account_id;

  const {
    data: transactionsResult,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken || !accountId) return { items: [], pagination: null };
      const userId = requireUserId(session);
      return withSessionRefresh(session, () =>
        getMastercardActionsForCard(userId, accountId, card.id, session.getRequestOptions(), { count: 50 }),
      );
    },
    [],
    { execute: session.isConfigured && !session.isLoading && !!accountId },
  );

  const transactions = transactionsResult?.items ?? [];

  if (!accountId) {
    return (
      <List navigationTitle={`${getCardName(card)} - Transactions`}>
        <List.EmptyView
          icon={Icon.CreditCard}
          title="No Linked Account"
          description="This card doesn't have a linked account to fetch transactions from"
        />
      </List>
    );
  }

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

  return (
    <List isLoading={isLoading} navigationTitle={`${getCardName(card)} - Transactions`}>
      {transactions.length === 0 && (
        <List.EmptyView
          icon={Icon.CreditCard}
          title="No Transactions"
          description="No Mastercard transactions found for this card"
        />
      )}
      {transactions.map((action) => {
        const amount = action.amount_local ?? action.amount_billing;
        const amountValue = amount?.value ?? "0";
        const amountStr = amount
          ? formatCurrency(Math.abs(parseFloat(amountValue)).toFixed(2), amount.currency)
          : "Unknown";
        const isRefund = parseFloat(amountValue) > 0;
        const counterparty =
          action.counterparty_alias?.display_name ||
          action.counterparty_alias?.name ||
          action.description ||
          "Unknown Merchant";
        const statusAppearance = getMastercardActionStatusAppearance(action.decision || "UNKNOWN");
        const city = action.city || "";

        return (
          <List.Item
            key={action.id}
            title={counterparty}
            subtitle={city}
            icon={{ source: Icon.CreditCard, tintColor: statusAppearance.color }}
            accessories={[
              { tag: { value: statusAppearance.label, color: statusAppearance.color } },
              ...(action.created ? [{ date: new Date(action.created), tooltip: "Transaction date" }] : []),
              {
                text: {
                  value: isRefund ? `+${amountStr}` : `-${amountStr}`,
                  color: getBalanceColor(isRefund ? "1" : "-1"),
                },
                tooltip: "Amount",
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Merchant"
                  icon={Icon.Clipboard}
                  onAction={() => copyToClipboard(counterparty, "merchant")}
                />
                {amount && (
                  <Action
                    title="Copy Amount"
                    icon={Icon.Clipboard}
                    onAction={() => copyToClipboard(amount.value, "amount")}
                  />
                )}
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
