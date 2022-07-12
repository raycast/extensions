import { OpenInYnabAction } from '@components/actions';
import { TransactionCreationForm } from '@components/transactions/transactionCreationForm';
import { useAccounts } from '@hooks/useAccounts';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { formatToReadablePrice } from '@lib/utils';
import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { CurrencyFormat } from '@srcTypes';

export function AccountView() {
  const [activeBudgetId] = useLocalStorage('activeBudgetId', '');
  const { data: accounts, isValidating } = useAccounts(activeBudgetId);
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  return (
    <List isLoading={isValidating}>
      {accounts?.map((account) => (
        <List.Item
          key={account.id}
          icon={{ source: Icon.Circle, tintColor: account.on_budget ? Color.Green : Color.Red }}
          title={account.name}
          accessoryTitle={formatToReadablePrice({
            amount: account.balance,
            currency: activeBudgetCurrency,
          })}
          accessoryIcon={{
            source: Icon.Link,
            tintColor: account.direct_import_linked
              ? account.direct_import_in_error
                ? Color.Red
                : Color.Green
              : Color.SecondaryText,
          }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Transaction"
                icon={Icon.Plus}
                target={<TransactionCreationForm accountId={account.id} />}
                shortcut={{ modifiers: ['cmd'], key: 'c' }}
              />
              <OpenInYnabAction accounts accountId={account.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
