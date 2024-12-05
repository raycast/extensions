import { SWRConfig } from 'swr';
import { launchCommand, LaunchType, MenuBarExtra } from '@raycast/api';

import { cacheConfig } from '@lib/cache';
import { useTransactions } from '@hooks/useTransactions';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { Fragment } from 'react';

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <UnReviewedTransactionsView />
    </SWRConfig>
  );
}

const UnReviewedTransactionsView = () => {
  const [activeBudgetId] = useLocalStorage('activeBudgetId', '');
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
    {}
  );

  return (
    <MenuBarExtra
      isLoading={isLoading}
      tooltip={`You have ${nTransactions} unreviewed transaction${rule === 'one' ? '' : 's'}`}
      icon="ynab-tree.png"
    >
      <MenuBarExtra.Item
        title="Review all transactions"
        onAction={() =>
          launchCommand({ name: 'transactions', type: LaunchType.UserInitiated, context: { search: `is:unapproved` } })
        }
      />
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
                  context: { search: `account:${accountName.split(' ').join('-').toLowerCase()} is:unapproved` },
                })
              }
            />
          </Fragment>
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
};
