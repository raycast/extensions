import { TransactionEditForm } from '@components/transactions/transactionEditForm';
import { Shortcuts } from '@constants';
import { useTransactions } from '@hooks/useTransactions';
import { updateTransaction } from '@lib/api';
import { formatToReadableAmount } from '@lib/utils';
import {
  Action,
  confirmAlert,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  useNavigation,
  type Alert,
} from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';
import { CurrencyFormat, Period, TransactionDetail } from '@srcTypes';

const preferences = getPreferenceValues<Preferences>();
interface ApproveTransactionActionProps {
  transaction: TransactionDetail;
}

export function ApproveTransactionAction({ transaction }: ApproveTransactionActionProps) {
  const { push } = useNavigation();

  const { value: activeBudgetId = '' } = useLocalStorage('activeBudgetId', '');
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const { value: timeline } = useLocalStorage<Period>('timeline', 'month');

  const { mutate } = useTransactions(activeBudgetId, timeline);

  return (
    <Action
      title="Approve Transaction"
      onAction={async () => {
        // Does the transaction have a category
        const isSimpleTransaction =
          transaction.category_id || transaction.subtransactions.length > 0 || transaction.transfer_account_id;
        if (isSimpleTransaction) {
          // Show a modal to make sure the user really wants to update
          const options: Alert.Options = {
            title: 'Approve the transaction?',
            message: `The ${formatToReadableAmount({
              amount: transaction.amount,
              currency: activeBudgetCurrency,
            })} transaction with ${transaction.payee_name} will be approved`,
            primaryAction: {
              title: 'Approve',
            },
          };

          if (await confirmAlert(options)) {
            const toast = await showToast({ style: Toast.Style.Animated, title: 'Approving transaction' });
            try {
              await mutate(updateTransaction(activeBudgetId, transaction.id, { ...transaction, approved: true }), {
                optimisticUpdate(currentData) {
                  if (!currentData) return;

                  const transactionIdx = currentData.findIndex((tx) => tx.id === transaction.id);

                  if (transactionIdx < 0) return currentData;

                  const newData = [...currentData];

                  newData.splice(transactionIdx, 1, { ...transaction, approved: true });

                  return newData;
                },
                shouldRevalidateAfter: !preferences.quickRevalidate,
              });

              toast.style = Toast.Style.Success;
              toast.title = 'Transaction approved successfully';
              return;
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = 'Failed to approve transaction';

              if (error instanceof Error) {
                toast.message = error.message;
              }
            }
          }
        } else if (!transaction.category_id) {
          push(<TransactionEditForm transaction={transaction} forApproval />);
        }
      }}
      icon={Icon.CheckCircle}
      shortcut={Shortcuts.ApproveTransaction}
    />
  );
}
