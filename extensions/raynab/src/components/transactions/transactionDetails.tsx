import { Action, ActionPanel, Detail } from '@raycast/api';
import { CurrencyFormat, TransactionDetail } from '@srcTypes';
import dayjs from 'dayjs';

import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

import { formatToReadablePrice } from '@lib/utils';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { OpenInYnabAction } from '@components/actions';

export function TransactionDetails({ transaction }: { transaction: TransactionDetail }) {
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  const markdown = `
  # ${transaction.amount > 0 ? 'Inflow to' : 'Outflow from'} ${transaction.account_name}

  - **Amount**: ${formatToReadablePrice({
    amount: transaction.amount,
    currency: activeBudgetCurrency,
  })}
  - **Payee**: ${transaction.payee_name ?? 'Not Specified'}
  - **Date**: ${dayjs(transaction.date).format('LL')}
  - **Category**: ${transaction.category_name ?? 'Not Specified'}
  `;
  return (
    <Detail
      navigationTitle="Transaction Details"
      markdown={markdown}
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
