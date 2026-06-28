import { OpenInYnabAction } from '@components/actions';
import { TransactionCreateForm } from '@components/transactions/transactionCreateForm';
import { TransactionView } from '@components/transactions/transactionView';
import { Shortcuts } from '@constants';
import { useAccounts } from '@hooks/useAccounts';
import { formatToReadableAmount } from '@lib/utils';
import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';
import { CurrencyFormat } from '@srcTypes';

export function AccountView() {
  const { value: activeBudgetId } = useLocalStorage('activeBudgetId', '');
  const { data: accounts, isLoading } = useAccounts(activeBudgetId);
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  return (
    <List isLoading={isLoading}>
      {accounts?.map((account) => (
        <List.Item
          key={account.id}
          icon={{ source: Icon.Circle, tintColor: account.on_budget ? Color.Green : Color.Red }}
          title={account.name}
          accessories={[
            {
              text: formatToReadableAmount({
                amount: account.balance,
                currency: activeBudgetCurrency,
              }),
            },
            {
              icon: {
                source: Icon.Link,
                tintColor: account.direct_import_linked
                  ? account.direct_import_in_error
                    ? Color.Red
                    : Color.Green
                  : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Related Transactions"
                icon={Icon.MagnifyingGlass}
                target={<TransactionView search={`account:${account.name.toLowerCase()}`} />}
              />
              <Action.Push
                title="Create New Transaction"
                icon={Icon.Plus}
                target={<TransactionCreateForm accountId={account.id} />}
                shortcut={Shortcuts.CreateNewTransaction}
              />
              <OpenInYnabAction accounts accountId={account.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
