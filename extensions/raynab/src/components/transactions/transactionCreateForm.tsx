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
  useNavigation,
} from '@raycast/api';
import { FormValidation, useForm, useLocalStorage } from '@raycast/utils';
import { useMemo, useState } from 'react';

import { createTransaction } from '@lib/api';
import {
  autoDistribute,
  easyGetColorFromId,
  formatToReadableAmount,
  formatToYnabAmount,
  getSubtransacionCategoryname,
} from '@lib/utils';
import { useAccounts } from '@hooks/useAccounts';
import { useCategoryGroups } from '@hooks/useCategoryGroups';
import { nanoid as random } from 'nanoid';

import { TransactionFlagColor, TransactionClearedStatus } from 'ynab';
import { CurrencyFormat, Period, SaveSubTransactionWithReadableAmounts } from '@srcTypes';
import { useTransactions } from '@hooks/useTransactions';
import { AutoDistributeAction } from '@components/actions/autoDistributeAction';
import { Shortcuts } from '@constants';
import { usePayees } from '@hooks/usePayees';
import { onSubtransactionAmountChangeHandler } from '@lib/utils/transactions';

interface FormValues {
  date: Date | null;
  account_id: string;
  amount: string;
  payee_name?: string;
  payee_id?: string;
  memo?: string;
  flag_color?: string;
  categoryList?: string[];
  cleared: boolean;
  approved: boolean;
  subtransactions?: SaveSubTransactionWithReadableAmounts[];
}

interface TransactionCreateFormProps {
  categoryId?: string;
  accountId?: string;
  transaction?: {
    account_id: string;
    amount: number;
    payee_name: string;
    payee_id: string;
    memo?: string;
    flag_color?: string;
    date?: string;
    cleared?: string;
    approved?: boolean;
  };
}

export function TransactionCreateForm({ accountId, transaction }: TransactionCreateFormProps) {
  const { pop } = useNavigation();
  // 1. All hooks must be called unconditionally at the top
  const { value: activeBudgetId = '', isLoading: isLoadingBudgetId } = useLocalStorage('activeBudgetId', '');
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const { value: timeline } = useLocalStorage<Period>('timeline', 'month');

  // Data fetching hooks - always called but may not execute if no budget ID
  const { mutate } = useTransactions(activeBudgetId || '', timeline);
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts(activeBudgetId || '');
  const { data: payees = [], isLoading: isLoadingPayees } = usePayees(activeBudgetId || '');
  const { data: categoryGroups, isLoading: isLoadingCategories } = useCategoryGroups(activeBudgetId || '');

  // Memoize loading state to prevent unnecessary re-renders
  const isLoading = useMemo(
    () => isLoadingBudgetId || isLoadingAccounts || isLoadingPayees || isLoadingCategories,
    [isLoadingBudgetId, isLoadingAccounts, isLoadingPayees, isLoadingCategories],
  );

  // Memoize categories to prevent unnecessary re-renders
  const categories = useMemo(
    () => categoryGroups?.flatMap((group) => group.categories).filter((c) => !c.hidden),
    [categoryGroups],
  );

  // Memoize possible accounts to prevent unnecessary re-renders
  const possibleAccounts = useMemo(() => {
    const filteredAccounts = accounts.filter((account) => !account.closed && !account.deleted && account.on_budget);
    return filteredAccounts.map((account) => (
      <Form.Dropdown.Item key={account?.id ?? random()} value={account?.id} title={account?.name} />
    ));
  }, [accounts]);

  // Memoize payee dropdown items
  const payeeItems = useMemo(() => {
    return payees?.map((payee) => <Form.Dropdown.Item key={payee.id} value={payee.id} title={payee.name} />);
  }, [payees]);

  // State hooks - always called
  const [isTransfer, setIsTransfer] = useState(false);
  const [transferFrom, setTransferTo] = useState('');
  const [selectOwnPayee, setselectOwnPayee] = useState(!!transaction?.payee_name);
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [subtransactions, setSubtransactions] = useState<SaveSubTransactionWithReadableAmounts[]>([]);

  // Memoize category items
  const categoryItems = useMemo(() => {
    return categories?.map((category, idx) => (
      <Form.TagPicker.Item
        key={category.id}
        value={category.id}
        title={category.name}
        icon={{ source: Icon.PlusCircle, tintColor: easyGetColorFromId(idx) }}
      />
    ));
  }, [categories]);

  // Memoize subtransaction fields
  const subtransactionFields = useMemo(() => {
    if (subtransactions.length === 0 || isTransfer) return null;
    return subtransactions.map((transaction, idx) => (
      <Form.TextField
        id={`subtransaction-${idx}`}
        key={transaction.category_id}
        title={getSubtransacionCategoryname(categories, transaction)}
        value={transaction.amount}
        onChange={onSubcategoryAmountChange(transaction)}
      />
    ));
  }, [subtransactions, isTransfer, categories]);

  // Move the handler definition here so it's before its first usage
  const onSubcategoryAmountChange = onSubtransactionAmountChangeHandler({
    amount,
    currency: activeBudgetCurrency,
    subtransactions,
    setSubtransactions,
  });

  // Form hook - always called
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      date: transaction?.date ? new Date(transaction.date) : new Date(new Date().toLocaleDateString()),
      account_id: transaction?.account_id || accountId || '',
      amount: transaction?.amount?.toString() || '',
      payee_name: transaction?.payee_name || '',
      payee_id: transaction?.payee_id || '',
      memo: transaction?.memo || '',
      flag_color: transaction?.flag_color,
      categoryList: [],
      cleared: transaction?.cleared === 'cleared',
      approved: transaction?.approved || false,
    },
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: 'Creating Transaction' });

      try {
        const transactionData = {
          ...values,
          date: values.date ? values.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          amount: formatToYnabAmount(values.amount, activeBudgetCurrency),
          approved: true,
          category_id: isTransfer ? null : values.categoryList?.[0] || undefined,
          payee_name: values.payee_id ? undefined : values.payee_name,
          cleared: values.cleared ? TransactionClearedStatus.Cleared : TransactionClearedStatus.Uncleared,
          flag_color: values.flag_color ? (values.flag_color as TransactionFlagColor) : null,
          subtransactions: undefined,
        };

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

        await mutate(createTransaction(activeBudgetId, transactionData));
        toast.style = Toast.Style.Success;
        toast.title = 'Transaction created successfully';
        pop();
      } catch (error) {
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
      amount: (value: string | undefined) => {
        if (!value) return 'Please enter an amount';

        // Normalize the amount based on currency format, similar to formatToYnabAmount
        const normalizedAmount = activeBudgetCurrency
          ? value
              .replaceAll(activeBudgetCurrency.group_separator, '')
              .replaceAll(activeBudgetCurrency.decimal_separator, '.')
          : value;

        const num = Number(normalizedAmount);
        if (isNaN(num)) return 'Please enter a valid number';
        if (num === 0) return 'Amount cannot be zero';
        return undefined;
      },
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

  // Now we can do our conditional rendering
  if (isLoading) {
    return <Form isLoading />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          {subtransactions.length > 1 ? (
            <AutoDistributeAction
              amount={amount}
              currency={activeBudgetCurrency}
              categoryList={categoryList}
              setSubtransactions={setSubtransactions}
            />
          ) : null}
          <Action
            title={selectOwnPayee ? 'Show Payee Dropdown' : 'Show Payee Textfield'}
            onAction={() => setselectOwnPayee((v) => !v)}
            shortcut={Shortcuts.TogglePayeeFieldType}
          />
        </ActionPanel>
      }
      navigationTitle="Create transaction"
    >
      <Form.Description
        title="Create a new transaction"
        text="Enter your transaction details below. Amounts can be positive or negative."
      />
      <Form.DatePicker {...itemProps.date} title="Date of Transaction" type={Form.DatePicker.Type.Date} />
      <Form.TextField
        {...itemProps.amount}
        title={`Amount ${activeBudgetCurrency?.currency_symbol ? `(${activeBudgetCurrency.currency_symbol})` : ''}`}
        value={amount}
        onChange={setAmount}
      />
      <Form.Checkbox id="transfer" label="The transaction is a transfer" value={isTransfer} onChange={setIsTransfer} />
      {isTransfer ? (
        <Form.Dropdown {...itemProps.payee_id} title="Transfer from" value={transferFrom} onChange={setTransferTo}>
          {possibleAccounts}
        </Form.Dropdown>
      ) : !selectOwnPayee ? (
        <Form.Dropdown {...itemProps.payee_id} title="Payee" info="Press Opt+P to add a payee not in the list">
          {payeeItems}
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
            // Force validation reset
            itemProps.categoryList.onChange?.(newCategories);
          }}
        >
          {categoryItems}
        </Form.TagPicker>
      ) : null}

      {subtransactionFields}

      <Form.Separator />

      <Form.TextArea {...itemProps.memo} title="Memo" placeholder="Enter additional information…" />

      <Form.Dropdown {...itemProps.flag_color} title="Flag Color">
        <Form.Dropdown.Item value="" title="No Flag" icon={{ source: Icon.Dot }} />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Red}
          title="Red"
          icon={{ source: Icon.Dot, tintColor: Color.Red }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Orange}
          title="Orange"
          icon={{ source: Icon.Dot, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Yellow}
          title="Yellow"
          icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Green}
          title="Green"
          icon={{ source: Icon.Dot, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Blue}
          title="Blue"
          icon={{ source: Icon.Dot, tintColor: Color.Blue }}
        />
        <Form.Dropdown.Item
          value={TransactionFlagColor.Purple}
          title="Purple"
          icon={{ source: Icon.Dot, tintColor: Color.Purple }}
        />
      </Form.Dropdown>
    </Form>
  );
}
