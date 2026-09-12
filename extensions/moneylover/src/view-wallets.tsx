import {
  ActionPanel,
  List,
  Action,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Color,
  useNavigation,
} from '@raycast/api';
import MoneyLover, { AddTransactionParams, Wallet } from 'moneylover';
import { formatBalance, formatNumber, getBalance, getIcon } from './utils';
import { FormValidation, useCachedPromise, useForm, usePromise } from '@raycast/utils';
import { useState } from 'react';

let moneyLoverApi: MoneyLover;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { email, password } = preferences;

  const {
    isLoading,
    data: wallets,
    mutate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast(Toast.Style.Animated, 'Authenticating');
      const accessToken = await MoneyLover.authenticate(email, password);
      if (!accessToken) throw new Error('Make sure your credentials are valid!');
      moneyLoverApi = new MoneyLover(accessToken);

      toast.title = 'Fetching Wallets';
      const wallets = await moneyLoverApi.listWallets();
      const unArchivedWallets = wallets.filter((wallet) => !wallet.archived);
      toast.style = Toast.Style.Success;
      toast.title = `Fetched ${unArchivedWallets.length} wallets`;
      return unArchivedWallets;
    },
    [],
    {
      initialData: [],
    }
  );
  async function onBalanceChange(wallet: Wallet) {
    await mutate(undefined, {
      optimisticUpdate() {
        const updatedWallets = wallets.map((w) => (w._id === wallet._id ? wallet : w));
        return updatedWallets;
      },
      shouldRevalidateAfter: false,
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search wallet">
      <List.Section title="Wallets">
        {wallets.map((wallet) => (
          <List.Item
            key={wallet._id}
            icon={{ source: getIcon(wallet.icon), fallback: Icon.Wallet }}
            title={wallet.name}
            subtitle={formatBalance(wallet.balance)}
            accessories={[
              { icon: wallet.transaction_notification ? Icon.Bell : Icon.BellDisabled },
              { date: new Date(wallet.updateAt) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={{ source: Icon.Pencil, tintColor: Color.Green }}
                  title="Adjust Balance"
                  target={<AdjustBalanceScreen wallet={wallet} onCompleted={onBalanceChange} />}
                />
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Transaction"
                  target={<AddTransaction wallet={wallet} onCompleted={onBalanceChange} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function AdjustBalanceScreen({ wallet, onCompleted }: { wallet: Wallet; onCompleted: (wallet: Wallet) => void }) {
  const { itemProps, handleSubmit: formHandleSubmit } = useForm<{ balance: string }>({
    onSubmit(values) {
      handleSubmit(values);
    },
    validation: {
      balance(value) {
        if (!value) return 'The item is required';
        if (Number.isNaN(+value)) return 'The item must be a number';
      },
    },
  });

  const { pop } = useNavigation();

  const { currency } = getBalance(wallet.balance);

  async function handleSubmit(formData: { balance: string }) {
    await showToast({ title: 'Adjusting Balance...', style: Toast.Style.Animated });

    try {
      await moneyLoverApi.adjustBalance({
        walletId: wallet._id,
        amount: +formData.balance,
      });
      wallet.balance[0][currency] = formData.balance;
      onCompleted(wallet);
      await showToast({
        title: `Balance updated ${formatNumber(+formData.balance, currency)}`,
        style: Toast.Style.Success,
      });

      pop();
    } catch {
      await showToast({
        title: 'Error',
        message: 'Could not adjust balance',
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            title="Adjust Balance"
            onSubmit={formHandleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Wallet" text={wallet.name} />
      <Form.TextField title="Balance" placeholder={formatBalance(wallet.balance)} {...itemProps.balance} />
    </Form>
  );
}

function AddTransaction({ wallet, onCompleted }: { wallet: Wallet; onCompleted: (wallet: Wallet) => void }) {
  const [execute, setExecute] = useState(false);

  type AddTransaction = {
    walletId: string;
    amount: string;
    categoryId: string;
    displayDate: Date | null;
    excludeReport?: boolean;
    image?: string;
    note?: string;
    withList?: string[];
  };
  const { itemProps, handleSubmit, values } = useForm<AddTransaction>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      displayDate: new Date(),
    },
    validation: {
      amount(value) {
        if (!value) return 'The item is required';
        if (Number.isNaN(+value)) return 'The item must be a number';
        if (Number(value) < 1) return 'The item must be greater than 0';
      },
      categoryId: FormValidation.Required,
      displayDate: FormValidation.Required,
    },
  });

  const { pop } = useNavigation();

  const { currency, balance } = getBalance(wallet.balance);

  const { isLoading: isAdding } = usePromise(
    async () => {
      await showToast({ title: 'Adding Transaction...', style: Toast.Style.Animated });

      const newTransaction: AddTransactionParams = {
        walletId: wallet._id,
        amount: +values.amount,
        categoryId: values.categoryId,
        displayDate: values.displayDate as Date,
        excludeReport: values.excludeReport,
      };
      if (values.note) newTransaction.note = values.note;
      const transaction = await moneyLoverApi.addTransaction(newTransaction);
      if (!transaction) throw new Error();

      wallet.balance[0][currency] = String(balance + +values.amount);
      await showToast({
        title: 'Added Transaction',
        style: Toast.Style.Success,
      });
      onCompleted(wallet);

      pop();
    },
    [],
    {
      execute,
      async onError() {
        setExecute(false);
        await showToast({
          title: 'Error',
          message: 'Could not add transaction',
          style: Toast.Style.Failure,
        });
      },
    }
  );

  const { isLoading: isFetching, data: categories } = useCachedPromise(
    async () => {
      const toast = await showToast(Toast.Style.Animated, 'Fetching Categories');
      const categories = await moneyLoverApi.listCategories();
      toast.style = Toast.Style.Success;
      toast.title = `Fetched ${categories.length} categories`;
      return categories;
    },
    [],
    {
      initialData: [],
    }
  );

  const isLoading = isFetching || isAdding;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            title="Add Transaction"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Wallet" text={wallet.name} />
      <Form.TextField title="Amount" placeholder="100" {...itemProps.amount} />
      <Form.Dropdown title="Category" {...itemProps.categoryId}>
        {categories.map((category) => (
          <Form.Dropdown.Item
            key={category._id}
            icon={getIcon(category.icon)}
            title={category.name}
            value={category._id}
          />
        ))}
      </Form.Dropdown>
      <Form.DatePicker title="Display Date" {...itemProps.displayDate} />

      <Form.Checkbox label="Exclude Report" {...itemProps.excludeReport} />
      <Form.TextField title="Note" {...itemProps.note} />
    </Form>
  );
}
