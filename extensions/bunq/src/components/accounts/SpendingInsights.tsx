/**
 * Spending insights component for visualizing spending by category.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { getInsights, type MonetaryAccount, type InsightCategory } from "../../api/endpoints";
import { ErrorView } from "../../components";
import { formatCurrency } from "../../lib/formatters";
import { getBalanceColor, getCategoryIcon } from "../../lib/status-helpers";
import { getErrorMessage } from "../../lib/errors";
import { copyToClipboard } from "../../lib/actions";

interface SpendingInsightsProps {
  account: MonetaryAccount;
  session: ReturnType<typeof useBunqSession>;
}

export function SpendingInsights({ account, session }: SpendingInsightsProps) {
  const {
    data: insights,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () => getInsights(session.userId!, account.id, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  if (error) {
    return (
      <ErrorView
        title="Error Loading Insights"
        message={getErrorMessage(error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  const sortedInsights = insights?.slice().sort((a: InsightCategory, b: InsightCategory) => {
    return Math.abs(parseFloat(b.total_amount.value)) - Math.abs(parseFloat(a.total_amount.value));
  });

  return (
    <List isLoading={isLoading} navigationTitle={`${account.description} - Spending Insights`}>
      {sortedInsights?.length === 0 && (
        <List.EmptyView icon={Icon.BarChart} title="No Insights" description="No spending data available yet" />
      )}
      {sortedInsights?.map((insight: InsightCategory, index: number) => {
        const amount = formatCurrency(insight.total_amount.value, insight.total_amount.currency, { absolute: true });
        const isExpense = parseFloat(insight.total_amount.value) < 0;
        const color = getBalanceColor(insight.total_amount.value);

        return (
          <List.Item
            key={`${insight.category}-${index}`}
            title={insight.category_translated || insight.category}
            subtitle={`${insight.number_of_transactions} transaction${insight.number_of_transactions !== 1 ? "s" : ""}`}
            icon={{ source: getCategoryIcon(insight.category), tintColor: color }}
            accessories={[{ text: { value: isExpense ? `-${amount}` : `+${amount}`, color }, tooltip: "Total amount" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Amount"
                  icon={Icon.Clipboard}
                  onAction={() => copyToClipboard(insight.total_amount.value, "amount")}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
