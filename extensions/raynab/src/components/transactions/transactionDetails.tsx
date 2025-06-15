import { Action, ActionPanel, Color, Detail, Icon } from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';

import { OpenInYnabAction } from '@components/actions';
import { CurrencyFormat, TransactionDetail } from '@srcTypes';
import { easyGetColorFromId, formatToReadableAmount, getFlagColor, time } from '@lib/utils';

export function TransactionDetails({ transaction }: { transaction: TransactionDetail }) {
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  const hasSubtransactions = transaction.subtransactions.length > 0;

  const markdown = `
  # ${transaction.transfer_account_id ? '' : transaction.amount > 0 ? 'Income from' : 'Outflow to'} ${
    transaction.payee_name
  }
  ${transaction.memo ?? ''}
  `;

  return (
    <Detail
      navigationTitle="Transaction Details"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Account" text={transaction.account_name} />
          <Detail.Metadata.Label
            title="Amount"
            text={formatToReadableAmount({ amount: transaction.amount, currency: activeBudgetCurrency })}
          />
          <Detail.Metadata.Label title="Date" text={time(transaction.date).format('LL')} />
          <Detail.Metadata.TagList title={hasSubtransactions ? 'Categories' : 'Category'}>
            {hasSubtransactions ? (
              [...transaction.subtransactions]
                .sort((a, b) => {
                  /* 
                    This might look a bit odd
                    But we're showing the highest income if the main
                    transaction is an inflow
                    And the highest spend if it is an outflow
                  */
                  if (transaction.amount > 0) {
                    return b.amount - a.amount;
                  } else {
                    return a.amount - b.amount;
                  }
                })
                .map((transaction, idx) => (
                  <Detail.Metadata.TagList.Item
                    key={transaction.id}
                    text={transaction.category_name ?? 'Not Specified'}
                    color={
                      transaction.category_name
                        ? transaction.category_name === 'Uncategorized'
                          ? null
                          : easyGetColorFromId(idx)
                        : Color.Red
                    }
                  />
                ))
            ) : (
              <Detail.Metadata.TagList.Item
                text={transaction.category_name ?? 'Not Specified'}
                color={transaction.category_name ? Color.Green : Color.Red}
              />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Status" text={transaction.cleared ? 'Cleared' : 'Uncleared'} />
          <Detail.Metadata.Label
            title="Flag"
            icon={{ source: Icon.Tag, tintColor: getFlagColor(transaction.flag_color) }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Transaction Amount"
            content={formatToReadableAmount({ amount: transaction.amount, currency: activeBudgetCurrency })}
          />
          <OpenInYnabAction />
        </ActionPanel>
      }
    />
  );
}
