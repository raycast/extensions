import {
  ActionPanel,
  List,
  Action,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  popToRoot,
  Icon,
  Color,
  useNavigation,
} from '@raycast/api';
import MoneyLover, { Wallet } from 'moneylover';
import { useEffect, useState } from 'react';
import { formatBalance, formatNumber, getBalance } from './utils';

interface Preferences {
  email: string;
  password: string;
}

let moneyLoverApi: MoneyLover;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { email, password } = preferences;

  const [isLoading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    async function instanciateMoneyLoverClient() {
      const accessToken = await MoneyLover.authenticate(email, password);
      moneyLoverApi = new MoneyLover(accessToken);
    }

    async function fetchWallets() {
      const wallets = await moneyLoverApi.listWallets();
      const unArchivedWallets = wallets.filter((wallet) => !wallet.archived);
      setWallets(unArchivedWallets);
    }

    async function main() {
      setLoading(true);

      try {
        await instanciateMoneyLoverClient();
        await fetchWallets();
      } catch (e) {
        const err = e as Error;
        await showToast({
          title: 'Error',
          message: err.message,
          style: Toast.Style.Failure,
        });
        await popToRoot();
      } finally {
        setLoading(false);
      }
    }
    main();
  }, []);

  function onBalanceChange(wallet: Wallet) {
    const updatedWallets = wallets.map((w) => (w._id === wallet._id ? wallet : w));
    setWallets(updatedWallets);
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Wallets">
        {wallets.map((wallet) => (
          <List.Item
            key={wallet._id}
            icon={`https://static.moneylover.me/img/icon/${wallet.icon}.png`}
            title={wallet.name}
            subtitle={formatBalance(wallet.balance)}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={{ source: Icon.Pencil, tintColor: Color.Green }}
                  title="Adjust Balance"
                  target={<AdjustBalanceScreen wallet={wallet} onCompleted={onBalanceChange} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

let timeout: NodeJS.Timeout | undefined;

function AdjustBalanceScreen({ wallet, onCompleted }: { wallet: Wallet; onCompleted: (wallet: Wallet) => void }) {
  const [balance, setBalance] = useState<string>('');
  const [balanceError, setBalanceError] = useState<string | undefined>();

  const { pop } = useNavigation();

  const { currency } = getBalance(wallet.balance);

  function handleOnChange(value: string) {
    if (Number.isNaN(+value)) {
      setBalanceError('You must type only numbers');
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setBalanceError(undefined);
      }, 2500);
      return;
    }

    setBalanceError(undefined);
    setBalance(value);
  }

  async function handleSubmit(formData: { balance: string }) {
    await showToast({ title: 'Adjusting balance...', style: Toast.Style.Animated });

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
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="balance"
        title="Balance"
        info={wallet.name}
        placeholder={formatBalance(wallet.balance)}
        value={balance}
        error={balanceError}
        onChange={handleOnChange}
      />
    </Form>
  );
}
