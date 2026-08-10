import {
  autoDistribute,
  easyGetColorFromId,
  formatToReadableFrequency,
  formatToReadableAmount,
  formatToYnabAmount,
  getSubtransacionCategoryname,
  time,
  onSubtransactionAmountChangeHandler,
} from '@lib/utils';
import {
  ActionPanel,
  Action,
  Form,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  captureException,
} from '@raycast/api';
import { createScheduledTransaction } from '@lib/api';
import { useAccounts } from '@hooks/useAccounts';
import { useCategoryGroups } from '@hooks/useCategoryGroups';
import { nanoid as random } from 'nanoid';

import { TransactionFlagColor, ScheduledTransactionFrequency } from 'ynab';
import { CurrencyFormat, SaveSubTransactionWithReadableAmounts } from '@srcTypes';
import { useMemo, useState } from 'react';
import { FormValidation, useForm, useLocalStorage } from '@raycast/utils';
import { usePayees } from '@hooks/usePayees';
import { Shortcuts } from '@constants';

const FREQUENCY_OPTIONS = [
  'never',
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const satisfies ScheduledTransactionFrequency[];

interface FormValues {
  date: Date | null;
  account_id: string;
  amount: string;
  payee_name?: string;
  payee_id?: string;
  memo?: string;
  flag_color?: string;
  categoryList?: string[];
  frequency: string;
  subtransactions?: SaveSubTransactionWithReadableAmounts[];
}

export function ScheduleTransactionCreateForm({ categoryId, accountId }: { categoryId?: string; accountId?: string }) {
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const { value: activeBudgetId = '' } = useLocalStorage('activeBudgetId', '');
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts(activeBudgetId);
  const { data: payees, isLoading: isLoadingPayees } = usePayees(activeBudgetId);
  const { data: categoryGroups, isLoading: isLoadingCategories } = useCategoryGroups(activeBudgetId);
  const categories = categoryGroups?.flatMap((group) => group.categories);

  const [categoryList, setCategoryList] = useState([categoryId ?? '']);
  const [subtransactions, setSubtransactions] = useState<SaveSubTransactionWithReadableAmounts[]>([]);
  const [amount, setAmount] = useState('0');

  const [isTransfer, setIsTransfer] = useState(false);
  const [transferFrom, setTransferTo] = useState('');
  const [selectOwnPayee, setselectOwnPayee] = useState(false);

  const possibleAccounts = useMemo(() => {
    return accounts
      .filter((account) => {
        if (isTransfer) {
          return account.transfer_payee_id !== transferFrom;
        }
        return true;
      })
      .map((account) => <Form.Dropdown.Item key={account?.id ?? random()} value={account?.id} title={account?.name} />);
  }, [accounts, isTransfer, transferFrom]);

  const currencySymbol = activeBudgetCurrency?.currency_symbol;
  const tomorrow = time().add(1, 'day').toDate();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      date: tomorrow,
      account_id: accountId,
      categoryList: categoryList,
      frequency: ScheduledTransactionFrequency.Never.toString(),
      payee_name: '',
      flag_color: '',
      payee_id: undefined,
    },
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: 'Scheduling Transaction' });

      try {
        const transactionData = {
          ...values,
          date: (values.date ?? tomorrow).toISOString(),
          amount: formatToYnabAmount(values.amount, activeBudgetCurrency),
          approved: true,
          // In transfers, the category id doesn't matter
          category_id: isTransfer ? null : values.categoryList?.[0] || undefined,
          payee_name: values.payee_id ? undefined : values.payee_name,
          flag_color: values.flag_color
            ? TransactionFlagColor[values.flag_color as keyof typeof TransactionFlagColor]
            : null,
          subtransactions: undefined,
          categoryList: undefined,
          frequency: values.frequency as ScheduledTransactionFrequency,
        };

        /**
         * We need make sure the total of subtransactions is equal to the transaction.
         * That validation makes sense to keep at this level
         * */
        if (subtransactions.length > 0) {
          transactionData.category_id = undefined;

          /* @ts-expect-error we're not allowing updates to existing subtransactions so this doesn't matter */
          transactionData.subtransactions = subtransactions.map((s) => ({
            ...s,
            amount: formatToYnabAmount(s.amount, activeBudgetCurrency),
          }));

          const subtransactionsTotal = subtransactions.reduce(
            (total, { amount }) => total + formatToYnabAmount(amount, activeBudgetCurrency),
            0,
          );
          const difference = subtransactionsTotal - transactionData.amount;

          if (difference !== 0) {
            const fmtSubTotal = formatToReadableAmount({
              amount: subtransactionsTotal,
              currency: activeBudgetCurrency,
              includeSymbol: false,
            });
            const fmtDifference = formatToReadableAmount({
              amount: difference,
              currency: activeBudgetCurrency,
              includeSymbol: false,
            });

            const onAutoDistribute = () => {
              const distributedAmounts = autoDistribute(transactionData.amount, subtransactions.length).map((amount) =>
                formatToReadableAmount({ amount, currency: activeBudgetCurrency, includeSymbol: false }),
              );
              setSubtransactions(subtransactions.map((s, idx) => ({ ...s, amount: distributedAmounts[idx] })));
            };

            const options: Alert.Options = {
              title: `Something Doesn't Add Up`,
              message: `The total is ${
                values.amount
              }, but the splits add up to ${fmtSubTotal}. How would you like to handle the unassigned ${fmtDifference}?`,
              primaryAction: {
                title: 'Auto-Distribute the amounts',
                onAction: onAutoDistribute,
              },
              dismissAction: {
                title: 'Adjust manually',
              },
            };

            await toast.hide();
            await confirmAlert(options);
            return;
          }
        }

        await createScheduledTransaction(activeBudgetId, transactionData);
        toast.style = Toast.Style.Success;
        toast.title = 'Transaction scheduled successfully';
      } catch (error: unknown) {
        toast.style = Toast.Style.Failure;
        captureException(error);
        toast.title = 'Failed to create transaction';

        if (error instanceof Error) {
          toast.message = error.message;
        }
      }
    },
    validation: {
      date: FormValidation.Required,
      frequency: FormValidation.Required,
      payee_name: (value) => {
        if (selectOwnPayee && !value && !isTransfer) {
          return 'Please add a counterparty';
        }
      },
      payee_id: (value) => {
        const errorMessage = 'Please select or enter a payee';

        if (!selectOwnPayee && !value) {
          return errorMessage;
        }
      },
      amount: FormValidation.Required,
      categoryList: (value) => {
        const errorMessage = 'Please add one or more categories to this transaction';

        if (isTransfer) return;

        if (!value) {
          return errorMessage;
        }
        if (value?.length === 0 && subtransactions.length === 0) return errorMessage;
      },
    },
  });

  const onSubcategoryAmountChange = onSubtransactionAmountChangeHandler({
    amount,
    currency: activeBudgetCurrency,
    subtransactions,
    setSubtransactions,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action
            title={selectOwnPayee ? 'Show Payee Dropdown' : 'Show Payee Textfield'}
            onAction={() => {
              setselectOwnPayee((v) => !v);
            }}
            shortcut={Shortcuts.TogglePayeeFieldType}
          />
        </ActionPanel>
      }
      navigationTitle="Create transaction"
      isLoading={isLoadingAccounts || isLoadingCategories}
    >
      <Form.Description
        title="Schedule a new transaction"
        text="Enter your transaction details below. Amounts can be positive or negative."
      />
      <Form.DatePicker
        {...itemProps.date}
        title="Date of Transaction"
        type={Form.DatePicker.Type.Date}
        min={tomorrow}
        info="Date of first occurence"
      />
      <Form.TextField
        {...itemProps.amount}
        title={`Amount ${currencySymbol ? `(${currencySymbol})` : ''}`}
        value={amount}
        onChange={setAmount}
      />
      <Form.Dropdown {...itemProps.frequency} title="Repeats">
        {FREQUENCY_OPTIONS.map((frequency) => (
          <Form.Dropdown.Item key={frequency} value={frequency} title={formatToReadableFrequency(frequency, false)} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="transfer" label="The transaction is a transfer" value={isTransfer} onChange={setIsTransfer} />
      {isTransfer ? (
        <Form.Dropdown {...itemProps.payee_id} title="Transfer from" value={transferFrom} onChange={setTransferTo}>
          {accounts.map((account) => (
            <Form.Dropdown.Item
              key={account?.id ?? random()}
              value={account?.transfer_payee_id ?? ''}
              title={account?.name}
            />
          ))}
        </Form.Dropdown>
      ) : !selectOwnPayee ? (
        <Form.Dropdown
          {...itemProps.payee_id}
          title="Payee"
          isLoading={isLoadingPayees}
          info="Press Opt+P to add a payee not in the list"
        >
          {payees?.map((payee) => <Form.Dropdown.Item key={payee.id} value={payee.id} title={payee.name} />)}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          {...itemProps.payee_name}
          title="Payee"
          info="Press Opt+P to select from the list of existing payees"
        />
      )}
      <Form.Dropdown {...itemProps.account_id} title={isTransfer ? 'To' : 'Account'} defaultValue={accountId}>
        {possibleAccounts}
      </Form.Dropdown>
      {!isTransfer ? (
        <Form.TagPicker
          {...itemProps.categoryList}
          title="Category"
          value={categoryList}
          onChange={(newCategories) => {
            if (newCategories.length > 1) {
              const distributedAmounts = autoDistribute(
                formatToYnabAmount(amount, activeBudgetCurrency),
                newCategories.length,
              ).map((amount) =>
                formatToReadableAmount({ amount, currency: activeBudgetCurrency, includeSymbol: false }),
              );
              setCategoryList(newCategories);
              setSubtransactions(
                newCategories.map((c, idx) => ({ category_id: c ?? '', amount: distributedAmounts[idx] })),
              );
            } else {
              setCategoryList(newCategories);
              setSubtransactions([]);
            }
          }}
        >
          {categories ? (
            categories.map((category, idx) => (
              <Form.TagPicker.Item
                key={category.id}
                value={category.id}
                title={category.name}
                icon={{ source: Icon.PlusCircle, tintColor: easyGetColorFromId(idx) }}
              />
            ))
          ) : (
            <Form.TagPicker.Item value="" title="" />
          )}
        </Form.TagPicker>
      ) : null}

      {subtransactions.length > 0 ? (
        <>
          <Form.Separator />
          {subtransactions.map((transaction, idx) => (
            <Form.TextField
              id={`subtransaction-${idx}`}
              key={transaction.category_id}
              title={getSubtransacionCategoryname(categories, transaction)}
              value={transaction.amount}
              onChange={onSubcategoryAmountChange(transaction)}
            />
          ))}
        </>
      ) : null}

      <Form.Separator />

      <Form.TextArea {...itemProps.memo} title="Memo" placeholder="Enter additional information…" />

      <Form.Dropdown {...itemProps.flag_color} title="Flag Color">
        <Form.Dropdown.Item value="" title="No Flag" icon={{ source: Icon.Dot }} />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Red.toString()}
          title="Red"
          icon={{ source: Icon.Dot, tintColor: Color.Red }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Orange.toString()}
          title="Orange"
          icon={{ source: Icon.Dot, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Yellow.toString()}
          title="Yellow"
          icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Green.toString()}
          title="Green"
          icon={{ source: Icon.Dot, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Blue.toString()}
          title="Blue"
          icon={{ source: Icon.Dot, tintColor: Color.Blue }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Purple.toString()}
          title="Purple"
          icon={{ source: Icon.Dot, tintColor: Color.Purple }}
        />
      </Form.Dropdown>
    </Form>
  );
}
