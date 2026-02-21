import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { buildMaybeUrl, maybe } from "./maybe";
import { Account, Transaction } from "./types";

export default function SearchTransactions() {
  const {isLoading,data: transactions, pagination} = useCachedPromise(() =>async(options) => {
    const data = await maybe.transactions.list({page: options.page+1});
    return {
      data: data.transactions,
      hasMore: data.pagination.page < data.pagination.total_pages
    };
  },[],{initialData:[]});

  const sortedGrouped = transactions
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .reduce((acc, transaction) => {
    const existing = acc.get(transaction.date) ?? [];
    existing.push(transaction);
    acc.set(transaction.date, existing);
    return acc;
  }, new Map<string, Transaction[]>());

  return <List isLoading={isLoading} pagination={pagination}>
    {!isLoading && !transactions.length ? <List.EmptyView icon={Icon.Layers} title="No entries found" description="Try adding an entry, editing filters or refining your search" /> : [...sortedGrouped].map(([date, transactions]) => <List.Section key={date} title={date}>
{transactions.map(transaction => <List.Item key={transaction.id} icon={getAvatarIcon(transaction.name)} title={transaction.name} subtitle={transaction.account.name} accessories={[{text: {value:transaction.amount.replace("-", ""), color: transaction.classification==="income" ? Color.Green : undefined}}]} actions={<ActionPanel>
  <Action.OpenInBrowser url={buildMaybeUrl(`transactions/${transaction.id}`)} />
</ActionPanel>} />)}
    </List.Section>)}
  </List>
}
