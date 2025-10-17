import { useCachedPromise, usePromise } from "@raycast/utils";
import { firefly } from "./firefly";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { AccountType, TransactionType } from "./types";

const ACCOUNT_TYPE_ICONS: Partial<Record<AccountType, Icon>> = {
  asset: Icon.BankNote,
  expense: Icon.Cart,
  revenue: Icon.Download,
  liabilities: Icon.Ticket
}
export default function SearchAccounts() {
const {isLoading,data: accounts, pagination} = useCachedPromise(() => async(options) => {
  const {data, meta} = await firefly.accounts.list({page: options.page+1});
  return {
    data,
    hasMore: meta.pagination.current_page!==meta.pagination.total_pages
  }
},[],{initialData: []})

return <List isLoading={isLoading} pagination={pagination}>
  {accounts.map(account => <List.Item key={account.id} icon={{source: ACCOUNT_TYPE_ICONS[account.attributes.type] ?? Icon.QuestionMark, tooltip: account.attributes.type}} title={account.attributes.name} actions={<ActionPanel>
    <Action.Push icon={Icon.PieChart} title="Transactions" target={<Transactions accountId={account.id} />} />
  </ActionPanel>} />)}
</List>
}

const TRANSACTION_TYPE_ICONS: Partial<Record<TransactionType, Icon>> = {
  deposit: Icon.AlignRight,
  transfer: Icon.ArrowsExpand,
  withdrawal: Icon.ArrowLeft
}
const TRANSACTION_TYPE_COLORS: Partial<Record<TransactionType, Color>> = {
  deposit: Color.Green,
  transfer: Color.Blue,
  withdrawal: Color.Red
}
function Transactions({accountId}:{accountId: string}) {
  const {isLoading,data,pagination} = usePromise(
    () => async(options) => {
      const {data,meta} = await firefly.accounts.listTransactions({accountId, page: options.page+1})
      return {
        data: data.map(t => ({id: t.id, transaction: t.attributes.transactions[0]})),
        hasMore: meta.pagination.current_page!==meta.pagination.total_pages
      }
    }
  )

  return <List isLoading={isLoading} pagination={pagination}>
    {data?.map(({id,transaction}) => <List.Item key={id} icon={TRANSACTION_TYPE_ICONS[transaction.type] ?? Icon.QuestionMark} title={transaction.description} accessories={[
      {
        text: {value: `${transaction.currency_symbol}${Number(transaction.amount).toFixed(transaction.currency_decimal_places)}`, color: TRANSACTION_TYPE_COLORS[transaction.type]}
      }
    ]} />)}
  </List>
}