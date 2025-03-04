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
  subtransactions?: SaveSubTransactionWithReadableAmounts[];
}

export function TransactionCreateForm({ categoryId, accountId }: { categoryId?: string; accountId?: string }) {
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const { value: activeBudgetId = '' } = useLocalStorage('activeBudgetId', '');

  const { value: timeline } = useLocalStorage<Period>('timeline', 'month');

  const { mutate } = useTransactions(activeBudgetId, timeline);

  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts(activeBudgetId);
  const { data: payees, isLoading: isLoadingPayees } = usePayees(activeBudgetId);
  const { data: categoryGroups, isLoading: isLoadingCategories } = useCategoryGroups(activeBudgetId);
  const categories = categoryGroups?.flatMap((group) => group.categories).filter((c) => !c.hidden);

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

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      date: new Date(),
      account_id: accountId,
      categoryList: categoryList,
      cleared: true,
      payee_name: '',
      flag_color: '',
      payee_id: undefined,
    },
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: 'Creating Transaction' });

      try {
        const transactionData = {
          ...values,
          date: (values.date ?? new Date()).toISOString(),
          amount: formatToYnabAmount(values.amount, activeBudgetCurrency),
          approved: true,
          // In transfers, the category id doesn't matter
          category_id: isTransfer ? null : values.categoryList?.[0] || undefined,
          payee_name: values.payee_id ? undefined : values.payee_name,
          cleared: values.cleared ? TransactionClearedStatus.Cleared : TransactionClearedStatus.Uncleared,
          flag_color: values.flag_color ? (values.flag_color as TransactionFlagColor) : null,
          subtransactions: undefined,
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

        await mutate(createTransaction(activeBudgetId, transactionData));
        toast.style = Toast.Style.Success;
        toast.title = 'Transaction created successfully';
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
        title="Create a new transaction"
        text="Enter your transaction details below. Amounts can be positive or negative."
      />
      <Form.DatePicker {...itemProps.date} title="Date of Transaction" type={Form.DatePicker.Type.Date} />
      <Form.TextField
        {...itemProps.amount}
        title={`Amount ${currencySymbol ? `(${currencySymbol})` : ''}`}
        value={amount}
        onChange={setAmount}
      />
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

      <Form.Checkbox {...itemProps.cleared} label="Mark as cleared" storeValue={true} />

      {subtransactions.length > 0 && !isTransfer ? (
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
