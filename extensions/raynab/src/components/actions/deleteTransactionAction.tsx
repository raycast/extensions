import { Shortcuts } from '@constants';
import { useTransactions } from '@hooks/useTransactions';
import { deleteTransaction } from '@lib/api';
import { formatToReadableAmount } from '@lib/utils';
import { Action, confirmAlert, Icon, showToast, Toast, Alert, getPreferenceValues } from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';
import { CurrencyFormat, Period, TransactionDetail } from '@srcTypes';

const preferences = getPreferenceValues<Preferences>();

interface DeleteTransactionActionProps {
  transaction: TransactionDetail;
  onTransactionDeleted?: () => void;
}

export function DeleteTransactionAction({ transaction, onTransactionDeleted }: DeleteTransactionActionProps) {
  const { value: activeBudgetId = '' } = useLocalStorage('activeBudgetId', '');
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const { value: timeline } = useLocalStorage<Period>('timeline', 'month');

  const { mutate } = useTransactions(activeBudgetId, timeline);

  return (
    <Action
      title="Delete Transaction"
      onAction={async () => {
        const options: Alert.Options = {
          title: 'Are you sure?',
          message: `The ${formatToReadableAmount({
            amount: transaction.amount,
            currency: activeBudgetCurrency,
          })} transaction with ${transaction.payee_name} will be deleted`,
          primaryAction: {
            title: 'Delete',
            style: Alert.ActionStyle.Destructive,
          },
        };

        if (await confirmAlert(options)) {
          const toast = await showToast({ style: Toast.Style.Animated, title: 'Deleting transaction' });
          try {
            await mutate(deleteTransaction(activeBudgetId, transaction.id), {
              optimisticUpdate(currentData) {
                if (!currentData) return;

                const transactionIdx = currentData.findIndex((tx) => tx.id === transaction.id);

                if (transactionIdx < 0) return currentData;

                const newData = [...currentData];

                newData.splice(transactionIdx, 1);

                return newData;
              },
              shouldRevalidateAfter: !preferences.quickRevalidate,
            });

            toast.style = Toast.Style.Success;
            toast.title = 'Transaction deleted successfully';
            onTransactionDeleted?.();
            return;
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = 'Failed to delete transaction';

            if (error instanceof Error) {
              toast.message = error.message;
            }
          }
        }
      }}
      icon={Icon.Trash}
      shortcut={Shortcuts.DeleteTransaction}
    />
  );
}
