import { autoDistribute, formatToReadableAmount, formatToYnabAmount } from '@lib/utils';
import { Action, Icon } from '@raycast/api';
import { CurrencyFormat, SaveSubTransactionWithReadableAmounts } from '@srcTypes';

export function AutoDistributeAction({
  amount,
  currency,
  categoryList,
  setSubtransactions,
}: {
  amount: string;
  currency: CurrencyFormat;
  categoryList: string[];
  setSubtransactions: (s: SaveSubTransactionWithReadableAmounts[]) => void;
}) {
  return (
    <Action
      title="Distribute Total Equally"
      onAction={() => {
        const distributedAmounts = autoDistribute(formatToYnabAmount(amount, currency), categoryList.length).map(
          (amount) => formatToReadableAmount({ amount, currency, includeSymbol: false }),
        );
        setSubtransactions(categoryList.map((c, idx) => ({ category_id: c ?? '', amount: distributedAmounts[idx] })));
      }}
      icon={Icon.PlusMinusDivideMultiply}
    />
  );
}
