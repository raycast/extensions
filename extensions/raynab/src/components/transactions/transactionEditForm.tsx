import { updateTransaction } from '@lib/api';
import { easyGetColorFromId, formatToReadablePrice, formatToYnabAmount, isNumberLike } from '@lib/utils';
import { Action, ActionPanel, Color, Form, Icon, showToast, Toast } from '@raycast/api';
import { FormValidation, useForm } from '@raycast/utils';
import { CategoryGroupWithCategories, CurrencyFormat, TransactionDetail } from '@srcTypes';
import { useState } from 'react';

import { SaveSubTransaction, SaveTransaction } from 'ynab';

import { useCategoryGroups } from '@hooks/useCategoryGroups';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { usePayees } from '@hooks/usePayees';

interface SaveSubTransactionWithReadableAmounts extends Omit<SaveSubTransaction, 'amount'> {
  amount: string;
}

interface FormValues {
  date: Date | null;
  amount: string;
  payee_id: string;
  memo?: string;
  category?: string[];
  flag_color?: string;
  subtransactions?: SaveSubTransactionWithReadableAmounts[];
}

export function TransactionEditForm({ transaction }: { transaction: TransactionDetail }) {
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const [activeBudgetId] = useLocalStorage('activeBudgetId', '');

  const { data: payees, isValidating: isPayeesLoading } = usePayees(activeBudgetId);
  const { data: categoryGroups, isValidating: isLoadingCategories } = useCategoryGroups(activeBudgetId);

  const [amount, setAmount] = useState(() => formatToReadablePrice({ amount: transaction.amount, locale: false }));
  const [subtransactions, setSubtransactions] = useState<SaveSubTransactionWithReadableAmounts[]>(() => {
    return transaction.subtransactions.map((s) => ({
      ...s,
      amount: formatToReadablePrice({ amount: s.amount, locale: false }),
    }));
  });
  const [category, setCategory] = useState(() => {
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
      category: category.length > 0 && !!category[0] ? category : subtransactions.map((s) => s.category_id ?? ''),
    },
    onSubmit: async (values) => {
      // Make sure to match the subtransactions amounts if they exist against the total amount
      // If they don't match ask the user to make sure they understand the consequences

      const submittedValues = {
        ...transaction,
        date: (values.date ?? new Date()).toISOString(),
        flag_color: values.flag_color
          ? SaveTransaction.FlagColorEnum[values.flag_color as keyof typeof SaveTransaction.FlagColorEnum]
          : null,
        amount: formatToYnabAmount(values.amount),
        payee_id: values.payee_id,
        memo: values.memo || null,
        category_id: values.category?.[0] || undefined,
        subtransactions:
          values.category?.length === 0
            ? subtransactions.map((s) => ({ ...s, amount: formatToYnabAmount(s.amount) }))
            : undefined,
      };

      const toast = await showToast({ style: Toast.Style.Animated, title: 'Updating Transaction' });
      updateTransaction(activeBudgetId, transaction.id, submittedValues)
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
      category: (value) => {
        if (value?.length === 0 && subtransactions.length === 0)
          return 'Please add one or more categories to this transaction';
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
        {...itemProps.category}
        title="Category"
        value={category}
        /* At the moment the API doesn't support updating existing split transactions' subtransactions */
        onChange={
          !isSplitTransaction(transaction)
            ? (newCategories) => {
                if (newCategories.length > 1) {
                  const distributedAmounts = autoDistribute(+amount, newCategories.length).map((amount) =>
                    amount.toString()
                  );
                  setCategory(newCategories);
                  setSubtransactions(
                    newCategories.map((c, idx) => ({ category_id: c ?? '', amount: distributedAmounts[idx] }))
                  );
                } else {
                  setCategory(newCategories);
                  setSubtransactions([]);
                }
              }
            : undefined
        }
      >
        {categoryGroups ? (
          categoryGroups
            .flatMap((g) => g.categories)
            .map((category, idx) => (
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
              title={getSubtransacionCategoryname(categoryGroups || [], transaction)}
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

/**
 * Distributes a total amount evenly across a specified number of items, handling rounding to cents.
 * If the rounded distributions don't sum exactly to the total amount, the difference is added to
 * the first item to ensure the total remains accurate.
 *
 * @param amount - The total amount to distribute (e.g., 100 for $100)
 * @param dividend - The number of items to distribute the amount across
 * @returns An array of numbers representing the distributed amounts, rounded to 2 decimal places
 *
 * @example
 * // Distributing $100 across 3 items
 * autoDistribute(100, 3) // Returns [33.34, 33.33, 33.33]
 */

function autoDistribute(amount: number, dividend: number): number[] {
  const baseAmount = amount / dividend;
  const roundedAmount = Math.round(baseAmount * 100) / 100;
  const total = roundedAmount * dividend;
  const difference = amount - total;

  if (difference === 0) {
    return Array(dividend).fill(roundedAmount);
  } else {
    const newAmounts = Array(dividend).fill(roundedAmount);
    newAmounts[0] = Math.round((newAmounts[0] + difference) * 100) / 100;
    return newAmounts;
  }
}

function isSplitTransaction(transaction: TransactionDetail): boolean {
  return transaction.category_name === 'Split' && transaction.subtransactions.length > 0;
}

function getSubtransacionCategoryname(
  categoryGroups: CategoryGroupWithCategories[],
  subtransaction: SaveSubTransactionWithReadableAmounts
): string {
  return categoryGroups?.flatMap((g) => g.categories).find((c) => c.id === subtransaction.category_id)?.name ?? '';
}
