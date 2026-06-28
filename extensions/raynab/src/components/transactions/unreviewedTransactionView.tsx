import { LaunchType } from '@raycast/api';

import { launchCommand } from '@raycast/api';

import { useTransactions } from '@hooks/useTransactions';
import { MenuBarExtra } from '@raycast/api';
import { Fragment } from 'react';
import { useLocalStorage } from '@raycast/utils';

export function UnreviewedTransactionView() {
  const { value: activeBudgetId } = useLocalStorage('activeBudgetId', '');
  const { isLoading, data: transactions } = useTransactions(activeBudgetId, 'month');

  const unreviewedTransactions = transactions?.filter((tx) => tx.approved !== true) ?? [];
  const pluralRules = new Intl.PluralRules('en-US', { type: 'cardinal' });

  const nTransactions = unreviewedTransactions?.length ?? 0;

  const rule = pluralRules.select(nTransactions);
  const txGroupedByAccountName = unreviewedTransactions.reduce<Record<string, typeof unreviewedTransactions>>(
    (grouped, tx) => {
      if (grouped[tx.account_name]) {
        grouped[tx.account_name].push(tx);
      } else {
        grouped[tx.account_name] = [tx];
      }

      return grouped;
    },
    {},
  );

  return (
    <MenuBarExtra
      isLoading={isLoading}
      tooltip={`You have ${nTransactions} unreviewed transaction${rule === 'one' ? '' : 's'}`}
      icon={{ source: { light: 'ynab-tree-light.png', dark: 'ynab-tree-dark.png' } }}
    >
      {unreviewedTransactions.length > 0 ? (
        <MenuBarExtra.Item
          title="Review all transactions"
          onAction={() =>
            launchCommand({
              name: 'transactions',
              type: LaunchType.UserInitiated,
              context: { filter: { key: 'unreviewed' } },
            })
          }
        />
      ) : (
        <MenuBarExtra.Item
          title="View all transactions"
          onAction={() =>
            launchCommand({
              name: 'transactions',
              type: LaunchType.UserInitiated,
            })
          }
        />
      )}
      <MenuBarExtra.Section>
        {Object.entries(txGroupedByAccountName).map(([accountName, items]) => (
          <Fragment key={accountName}>
            <MenuBarExtra.Item title={accountName} />
            <MenuBarExtra.Item
              key={`${accountName}-transactions`}
              title={`Review ${items?.length ?? 0} transaction${pluralRules.select(items.length) === 'one' ? '' : 's'}`}
              onAction={() =>
                launchCommand({
                  name: 'transactions',
                  type: LaunchType.UserInitiated,
                  context: {
                    search: `account:${accountName.toLowerCase()}`,
                    filter: { key: 'unreviewed' },
                  },
                })
              }
            />
          </Fragment>
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
