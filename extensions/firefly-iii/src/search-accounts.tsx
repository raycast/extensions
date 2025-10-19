import { useCachedPromise } from "@raycast/utils";
import { firefly } from "./firefly";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Account, AccountRole, AccountType, TransactionType } from "./types";

const ACCOUNT_TYPE_ICONS: Partial<Record<AccountType, Icon>> = {
  asset: Icon.BankNote,
  expense: Icon.Cart,
  revenue: Icon.Download,
  liabilities: Icon.Ticket
}
function getAccountSubtitle(account: Account) {
  if (account.attributes.account_role) {
    switch (account.attributes.account_role) {
      case AccountRole.defaultAsset: return "Default asset account"
      case AccountRole.sharedAsset: return "Shared asset account"
      case AccountRole.savingAsset: return "Savings account"
      case AccountRole.ccAsset: return "Credit card"
      case AccountRole.cashWalletAsset: return "Cash Wallet"
    }
  }
}
function getAccountAccessories(account: Account) {
  const {current_balance} = account.attributes;
  const accessories: List.Item.Accessory[] = [];
  if (account.attributes.account_number) accessories.push({text: account.attributes.account_number});
  if (account.attributes.iban) accessories.push({tag: account.attributes.iban});
  accessories.push({text: {value: `${account.attributes.currency_symbol}${current_balance}`, color: Number(current_balance)<0 ? Color.Red : Number(current_balance)>0 ? Color.Green : undefined}})
  return accessories
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
  {accounts.map(account => <List.Item key={account.id} icon={{source: ACCOUNT_TYPE_ICONS[account.attributes.type] ?? Icon.QuestionMark, tintColor: account.attributes.active ? Color.Green : Color.Red, tooltip: account.attributes.type}} title={account.attributes.name} subtitle={getAccountSubtitle(account)} accessories={getAccountAccessories(account)} actions={<ActionPanel>
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
  const {isLoading,data,pagination} = useCachedPromise(
    (accountId: string) => async(options) => {
      const {data,meta} = await firefly.accounts.listTransactions({accountId, page: options.page+1})
      return {
        data: data.map(t => ({id: t.id, transaction: t.attributes.transactions[0]})),
        hasMore: meta.pagination.current_page!==meta.pagination.total_pages
      }
    }, [accountId]
  )

  return <List isLoading={isLoading} pagination={pagination}>
    {data?.map(({id,transaction}) => <List.Item key={id} icon={{source: TRANSACTION_TYPE_ICONS[transaction.type] ?? Icon.QuestionMark, tooltip: transaction.type}} title={transaction.description} accessories={[
      {
        text: {value: `${transaction.currency_symbol}${Number(transaction.amount).toFixed(transaction.currency_decimal_places)}`, color: TRANSACTION_TYPE_COLORS[transaction.type]}
      }
    ]} />)}
  </List>
}