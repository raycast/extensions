import { autoDistribute, easyGetColorFromId, formatToYnabAmount, getSubtransacionCategoryname } from '@lib/utils';
import { ActionPanel, Action, Form, Icon, Color, showToast, Toast, confirmAlert, Alert } from '@raycast/api';
import { createTransaction } from '@lib/api';
import { useAccounts } from '@hooks/useAccounts';
import { useCategoryGroups } from '@hooks/useCategoryGroups';
import { nanoid as random } from 'nanoid';

import { SaveTransaction } from 'ynab';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { CurrencyFormat, SaveSubTransactionWithReadableAmounts } from '@srcTypes';
import { useState } from 'react';
import { FormValidation, useForm } from '@raycast/utils';

interface FormValues {
  date: Date | null;
  account_id: string;
  amount: string;
  payee_name: string;
  memo?: string;
  flag_color?: string;
  categoryList?: string[];
  cleared: boolean;
  subtransactions?: SaveSubTransactionWithReadableAmounts[];
}

export function TransactionCreationForm({ categoryId, accountId }: { categoryId?: string; accountId?: string }) {
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const [activeBudgetId] = useLocalStorage('activeBudgetId', '');
  const { data: accounts = [], isValidating: isLoadingAccounts } = useAccounts(activeBudgetId);
  const { data: categoryGroups, isValidating: isLoadingCategories } = useCategoryGroups(activeBudgetId);
  const categories = categoryGroups?.flatMap((group) => group.categories);

  const [categoryList, setCategoryList] = useState([categoryId ?? '']);
  const [subtransactions, setSubtransactions] = useState<SaveSubTransactionWithReadableAmounts[]>([]);
  const [amount, setAmount] = useState('0');

  const currencySymbol = activeBudgetCurrency?.currency_symbol;

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      date: new Date(),
      account_id: accountId,
      categoryList: categoryList,
      cleared: false,
      payee_name: '',
      flag_color: '',
    },
    onSubmit: async (values) => {
      const transactionData = {
        ...values,
        date: (values.date ?? new Date()).toISOString(),
        amount: formatToYnabAmount(values.amount),
        category_id: values.categoryList?.[0] || undefined,
        approved: true,
        cleared: values.cleared ? SaveTransaction.ClearedEnum.Cleared : SaveTransaction.ClearedEnum.Uncleared,
        flag_color: values.flag_color
          ? SaveTransaction.FlagColorEnum[values.flag_color as keyof typeof SaveTransaction.FlagColorEnum]
          : null,
        subtransactions: undefined,
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
                const distributedAmounts = autoDistribute(+values.amount, subtransactions.length).map((amount) =>
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

      const toast = await showToast({ style: Toast.Style.Animated, title: 'Creating Transaction' });

      createTransaction(activeBudgetId, transactionData)
        .then(() => {
          toast.style = Toast.Style.Success;
          toast.title = 'Transaction created successfully';
        })
        .catch(() => {
          toast.style = Toast.Style.Failure;
          toast.title = 'Failed to create transaction';
        });
    },
    validation: {
      date: FormValidation.Required,
      payee_name: FormValidation.Required,
      amount: FormValidation.Required,
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
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
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
      <Form.TextField {...itemProps.payee_name} title="Payee Name" placeholder="Enter the counterparty" />
      <Form.Dropdown {...itemProps.account_id} title="Account" defaultValue={accountId}>
        {accounts.map((account) => (
          <Form.Dropdown.Item key={account?.id ?? random()} value={account?.id} title={account?.name} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        {...itemProps.categoryList}
        title="Category"
        value={categoryList}
        onChange={(newCategories) => {
          if (newCategories.length > 1) {
            const distributedAmounts = autoDistribute(+amount, newCategories.length).map((amount) => amount.toString());
            setCategoryList(newCategories);
            setSubtransactions(
              newCategories.map((c, idx) => ({ category_id: c ?? '', amount: distributedAmounts[idx] }))
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

      <Form.Checkbox {...itemProps.cleared} label="Has the transaction cleared?" storeValue={true} />

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
          value={SaveTransaction.FlagColorEnum.Red.toString()}
          title="Red"
          icon={{ source: Icon.Dot, tintColor: Color.Red }}
        />
        <Form.Dropdown.Item
          value={SaveTransaction.FlagColorEnum.Orange.toString()}
          title="Orange"
          icon={{ source: Icon.Dot, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          value={SaveTransaction.FlagColorEnum.Yellow.toString()}
          title="Yellow"
          icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
        />
        <Form.Dropdown.Item
          value={SaveTransaction.FlagColorEnum.Green.toString()}
          title="Green"
          icon={{ source: Icon.Dot, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          value={SaveTransaction.FlagColorEnum.Blue.toString()}
          title="Blue"
          icon={{ source: Icon.Dot, tintColor: Color.Blue }}
        />
        <Form.Dropdown.Item
          value={SaveTransaction.FlagColorEnum.Purple.toString()}
          title="Purple"
          icon={{ source: Icon.Dot, tintColor: Color.Purple }}
        />
      </Form.Dropdown>
    </Form>
  );
}
