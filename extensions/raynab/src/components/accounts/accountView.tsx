import { OpenInYnabAction } from '@components/actions';
import { TransactionCreateForm } from '@components/transactions/transactionCreateForm';
import { TransactionView } from '@components/transactions/transactionView';
import { Shortcuts } from '@constants';
import { useAccounts } from '@hooks/useAccounts';
import { formatToReadablePrice } from '@lib/utils';
import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useActiveBudget, useActiveBudgetCurrency } from '@hooks/useLocalValues';

export function AccountView() {
  const { activeBudgetId, isLoadingActiveBudgetId } = useActiveBudget();
  const { activeBudgetCurrency, isLoadingActiveBudgetCurrency } = useActiveBudgetCurrency();
  const { data: accounts, isLoading } = useAccounts(activeBudgetId);

  return (
    <List isLoading={isLoading || isLoadingActiveBudgetId || isLoadingActiveBudgetCurrency}>
      {accounts?.map((account) => (
        <List.Item
          key={account.id}
          icon={{ source: Icon.Circle, tintColor: account.on_budget ? Color.Green : Color.Red }}
          title={account.name}
          accessories={[
            {
              text: formatToReadablePrice({
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
