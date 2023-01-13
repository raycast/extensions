import { Action, ActionPanel, Color, Detail, Icon } from '@raycast/api';
import { CurrencyFormat, TransactionDetail } from '@srcTypes';
import dayjs from 'dayjs';

import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

import { formatToReadablePrice, getFlagColor } from '@lib/utils';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { OpenInYnabAction } from '@components/actions';

export function TransactionDetails({ transaction }: { transaction: TransactionDetail }) {
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

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
            text={formatToReadablePrice({ amount: transaction.amount, currency: activeBudgetCurrency })}
          />
          <Detail.Metadata.Label title="Date" text={dayjs(transaction.date).format('LL')} />
          <Detail.Metadata.TagList title={hasSubtransactions ? 'Categories' : 'Category'}>
            {hasSubtransactions ? (
              transaction.subtransactions.map((transaction) => (
                <Detail.Metadata.TagList.Item
                  key={transaction.id}
                  text={transaction.category_name ?? 'Not Specified'}
                />
              ))
            ) : (
              <Detail.Metadata.TagList.Item text={transaction.category_name ?? 'Not Specified'} color={Color.Green} />
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
            content={formatToReadablePrice({ amount: transaction.amount, currency: activeBudgetCurrency })}
          />
          <OpenInYnabAction />
        </ActionPanel>
      }
    />
  );
}
