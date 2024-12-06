import { updateTransaction } from '@lib/api';
import {
  autoDistribute,
  easyGetColorFromId,
  formatToReadablePrice,
  formatToYnabAmount,
  getSubtransacionCategoryname,
  isNumberLike,
  isSplitTransaction,
} from '@lib/utils';
import { TransactionFlagColor } from 'ynab';
import { Action, ActionPanel, Alert, confirmAlert, Color, Form, Icon, showToast, Toast } from '@raycast/api';
import { FormValidation, useForm, useLocalStorage } from '@raycast/utils';
import { CurrencyFormat, SaveSubTransactionWithReadableAmounts, TransactionDetail } from '@srcTypes';
import { useState } from 'react';

import { useCategoryGroups } from '@hooks/useCategoryGroups';
import { usePayees } from '@hooks/usePayees';

interface FormValues {
  date: Date | null;
  amount: string;
  payee_id: string;
  memo?: string;
  categoryList?: string[];
  flag_color?: string;
  subtransactions?: SaveSubTransactionWithReadableAmounts[];
}

export function TransactionEditForm({ transaction }: { transaction: TransactionDetail }) {
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const { value: activeBudgetId = '' } = useLocalStorage<string>('activeBudgetId', '');

  const { data: payees, isValidating: isPayeesLoading } = usePayees(activeBudgetId);
  const { data: categoryGroups, isValidating: isLoadingCategories } = useCategoryGroups(activeBudgetId);
  const categories = categoryGroups?.flatMap((group) => group.categories);

  const [amount, setAmount] = useState(() => formatToReadablePrice({ amount: transaction.amount, locale: false }));
  const [subtransactions, setSubtransactions] = useState<SaveSubTransactionWithReadableAmounts[]>(() => {
    return transaction.subtransactions.map((s) => ({
      ...s,
      amount: formatToReadablePrice({ amount: s.amount, locale: false }),
    }));
  });
  const [categoryList, setCategoryList] = useState(() => {
    if (isSplitTransaction(transaction)) {
      return subtransactions.map((s) => s.category_id ?? '');
    }

    return [transaction.category_id ?? ''];
  });
  const currencySymbol = activeBudgetCurrency?.currency_symbol;

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      date: new Date(transaction.date),
      amount: formatToReadablePrice({ amount: transaction.amount, locale: false }),
      payee_id: transaction.payee_id ?? undefined,
      memo: transaction.memo ?? '',
      flag_color: transaction.flag_color?.toString() ?? undefined,
      categoryList:
        categoryList.length > 0 && !!categoryList[0] ? categoryList : subtransactions.map((s) => s.category_id ?? ''),
    },
    onSubmit: async (values) => {
      const transactionData = {
        ...transaction,
        date: (values.date ?? new Date()).toISOString(),
        flag_color: values.flag_color
          ? TransactionFlagColor[values.flag_color as keyof typeof TransactionFlagColor]
          : null,
        amount: formatToYnabAmount(values.amount),
        payee_id: values.payee_id,
        memo: values.memo || null,
        category_id: values.categoryList?.[0] || undefined,
      };

      /**
       * We need make sure the total of subtransactions is equal to the transaction.
       * That validation makes sense to keep at this level
       * */
      if (subtransactions.length > 0) {
        transactionData.category_id = undefined;

        /* @ts-expect-error we're not allowing updates to existing subtransactions so this doesn't matter */
        transactionData.subtransactions = subtransactions.map((s) => ({ ...s, amount: formatToYnabAmount(s.amount) }));

        const subtransactionsTotal = subtransactions.reduce((total, { amount }) => total + +amount, 0);
        const difference = subtransactionsTotal - +values.amount;

        if (difference !== 0) {
          const options: Alert.Options = {
            title: `Something Doesn't Add Up`,
            message: `The total is ${
              values.amount
            }, but the splits add up to ${subtransactionsTotal}. How would you like to handle the unassigned ${difference.toFixed(
              2
            )}?`,
            primaryAction: {
              title: 'Auto-Distribute the amounts',
              onAction: () => {
                const distributedAmounts = autoDistribute(+amount, subtransactions.length).map((amount) =>
                  amount.toString()
                );
                setSubtransactions(subtransactions.map((s, idx) => ({ ...s, amount: distributedAmounts[idx] })));
              },
            },
            dismissAction: {
              title: 'Adjust manually',
            },
          };
          await confirmAlert(options);
          return;
        }
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: 'Updating Transaction' });
      updateTransaction(activeBudgetId, transaction.id, transactionData)
        .then(() => {
          toast.style = Toast.Style.Success;
          toast.title = 'Transaction updated successfully';
        })
        .catch(() => {
          toast.style = Toast.Style.Failure;
          toast.title = 'Failed to update transaction';
        });
    },
    validation: {
      date: FormValidation.Required,
      amount: (value) => {
        if (!value) return 'Please enter a valid amount';

        if (isNumberLike(value) === false) return `${value} is not a valid number`;
      },
      payee_id: FormValidation.Required,
      categoryList: (value) => {
        const errorMessage = 'Please add one or more categories to this transaction';
        if (!value) {
          return errorMessage;
        }
        if (value?.length === 0 && subtransactions.length === 0) return errorMessage;
      },
    },
  });

  const onSubcategoryAmountChange = (
    sub: SaveSubTransactionWithReadableAmounts
  ): ((newValue: string) => void) | undefined => {
    const eventHandler = (newAmount: string) => {
      const oldList = [...subtransactions];
      const previousSubtransactionIdx = oldList.findIndex((s) => s.category_id === sub.category_id);

      if (previousSubtransactionIdx === -1) return;

      const newSubtransaction = { ...oldList[previousSubtransactionIdx], amount: newAmount };
      const newList = [...oldList];
      newList[previousSubtransactionIdx] = newSubtransaction;

      setSubtransactions(newList);
    };

    return eventHandler;
  };

  return (
    <Form
      navigationTitle="Edit Transaction"
      isLoading={isLoadingCategories}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Edit Transaction"
        text="Change one or more of the following fields to update the transaction. Amounts can be positive or negative."
      />
      <Form.DatePicker {...itemProps.date} title="Date of Transaction" type={Form.DatePicker.Type.Date} />
      <Form.TextField
        {...itemProps.amount}
        title={`Amount ${currencySymbol ? `(${currencySymbol})` : ''}`}
        value={amount}
        onChange={setAmount}
      />
      <Form.Dropdown {...itemProps.payee_id} title="Payee" isLoading={isPayeesLoading}>
        {payees?.map((payee) => (
          <Form.Dropdown.Item key={payee.id} value={payee.id} title={payee.name} />
        ))}
      </Form.Dropdown>

      {/*
        This form field is special. As we want to support split transactions with a simpler interface
        than the API allows us, we simulate them having the same behavior to the consumer but track
        them with two different states.
      */}
      <Form.TagPicker
        {...itemProps.categoryList}
        title="Category"
        value={categoryList}
        /* At the moment the API doesn't support updating existing split transactions' subtransactions */
        onChange={
          !isSplitTransaction(transaction)
            ? (newCategories) => {
                if (newCategories.length > 1) {
                  const distributedAmounts = autoDistribute(+amount, newCategories.length).map((amount) =>
                    amount.toString()
                  );
                  setCategoryList(newCategories);
                  setSubtransactions(
                    newCategories.map((c, idx) => ({ category_id: c ?? '', amount: distributedAmounts[idx] }))
                  );
                } else {
                  setCategoryList(newCategories);
                  setSubtransactions([]);
                }
              }
            : undefined
        }
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

      {/* We don't want to show split transactions' subtransaction amounts as they won't be updated anyway */}
      {subtransactions.length > 0 && !isSplitTransaction(transaction) ? (
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
        <Form.Dropdown.Item value="" title="No Flag" icon={{ source: Icon.Flag }} />
        <Form.Dropdown.Item value="red" title="Red" icon={{ source: Icon.Flag, tintColor: Color.Red }} />
        <Form.Dropdown.Item value="orange" title="Orange" icon={{ source: Icon.Flag, tintColor: Color.Orange }} />
        <Form.Dropdown.Item value="yellow" title="Yellow" icon={{ source: Icon.Flag, tintColor: Color.Yellow }} />
        <Form.Dropdown.Item value="green" title="Green" icon={{ source: Icon.Flag, tintColor: Color.Green }} />
        <Form.Dropdown.Item value="blue" title="Blue" icon={{ source: Icon.Flag, tintColor: Color.Blue }} />
        <Form.Dropdown.Item value="purple" title="Purple" icon={{ source: Icon.Flag, tintColor: Color.Purple }} />
      </Form.Dropdown>
    </Form>
  );
}
