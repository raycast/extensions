import { Icon, Color, List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { firefly } from "../firefly";
import { TransactionType } from "../types";
import CreateTransaction from "../create-transaction";

const TRANSACTION_TYPE_ICONS: Partial<Record<TransactionType, Icon>> = {
  deposit: Icon.AlignRight,
  "opening balance": Icon.Star,
  transfer: Icon.ArrowsExpand,
  withdrawal: Icon.ArrowLeft,
};
const TRANSACTION_TYPE_COLORS: Partial<Record<TransactionType, Color>> = {
  deposit: Color.Green,
  transfer: Color.Blue,
  withdrawal: Color.Red,
};
export default function Transactions({ accountId }: { accountId: string }) {
  const { isLoading, data, pagination, mutate } = useCachedPromise(
    (accountId: string) => async (options) => {
      const { data, meta } = await firefly.accounts.listTransactions({ accountId, page: options.page + 1 });
      return {
        data: data.map((t) => ({ id: t.id, transaction: t.attributes.transactions[0] })),
        hasMore: meta.pagination.current_page !== meta.pagination.total_pages,
      };
    },
    [accountId],
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {data?.map(({ id, transaction }) => (
        <List.Item
          key={id}
          icon={{ source: TRANSACTION_TYPE_ICONS[transaction.type] ?? Icon.QuestionMark, tooltip: transaction.type }}
          title={transaction.description}
          accessories={[
            {
              text: {
                value: `${transaction.currency_symbol}${Number(transaction.amount).toFixed(transaction.currency_decimal_places)}`,
                color: TRANSACTION_TYPE_COLORS[transaction.type],
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create" target={<CreateTransaction />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
