import { TransactionEditForm } from '@components/transactions/transactionEditForm';
import { Shortcuts } from '@constants';
import { updateTransaction } from '@lib/api';
import { formatToReadablePrice } from '@lib/utils';
import { Action, confirmAlert, Icon, showToast, Toast, useNavigation, type Alert } from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';
import { CurrencyFormat, TransactionDetail } from '@srcTypes';

interface ApproveTransactionActionProps {
  transaction: TransactionDetail;
}

export function ApproveTransactionAction({ transaction }: ApproveTransactionActionProps) {
  const { value: activeBudgetId = '' } = useLocalStorage('activeBudgetId', '');
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  const { push } = useNavigation();

  return (
    <Action
      title="Approve transaction"
      onAction={async () => {
        // Does the transaction have a category
        const isSimpleTransaction =
          transaction.category_id || transaction.subtransactions.length > 0 || transaction.transfer_account_id;
        if (isSimpleTransaction) {
          // Show a modal to make sure the user really wants to update
          const options: Alert.Options = {
            title: 'Approve the transaction?',
            message: `The ${formatToReadablePrice({
              amount: transaction.amount,
              currency: activeBudgetCurrency,
            })} transaction with ${transaction.payee_name} will be approved`,
            primaryAction: {
              title: 'Approve',
            },
          };

          if (await confirmAlert(options)) {
            const toast = await showToast({ style: Toast.Style.Animated, title: 'Approving transaction' });
            updateTransaction(activeBudgetId, transaction.id, { ...transaction, approved: true })
              .then(() => {
                toast.style = Toast.Style.Success;
                toast.title = 'Transaction approved successfully';
              })
              .catch(() => {
                toast.style = Toast.Style.Failure;
                toast.title = 'Failed to approved transaction';
              });
            return;
          }
        } else if (!transaction.category_id) {
          push(<TransactionEditForm transaction={transaction} forApproval />);
        }
      }}
      shortcut={Shortcuts.ApproveTransaction}
    />
  );
}
