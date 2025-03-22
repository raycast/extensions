import { autoDistribute } from '@lib/utils';
import { Action, Icon } from '@raycast/api';
import { SaveSubTransactionWithReadableAmounts } from '@srcTypes';

export function AutoDistributeAction({
  amount,
  categoryList,
  setSubtransactions,
}: {
  amount: string;
  categoryList: string[];
  setSubtransactions: (s: SaveSubTransactionWithReadableAmounts[]) => void;
}) {
  return (
    <Action
      title="Distribute Total Equally"
      onAction={() => {
        const distributedAmounts = autoDistribute(+amount, categoryList.length).map((amount) => amount.toString());
        setSubtransactions(categoryList.map((c, idx) => ({ category_id: c ?? '', amount: distributedAmounts[idx] })));
      }}
      icon={Icon.PlusMinusDivideMultiply}
    />
  );
}
