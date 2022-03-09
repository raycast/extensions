import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  showHUD,
  showToast,
  Toast,
} from '@raycast/api';
import { useEffect, useRef, useState } from 'react';
import { getCurrency } from './utils';
import Service, { Coin } from './service';

enum FormFieldDataType {
  Coin,
  Currency,
}

interface FormResult {
  amount: string;
  from: string;
  to: string;
}

const DEFAULT_COIN = 'bitcoin';

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const selectedCoin = useRef<string>(DEFAULT_COIN);
  const selectedCurrency = useRef<string>(getCurrency());
  const [fieldOrder, setFieldOrder] = useState<FormFieldDataType[]>([
    FormFieldDataType.Coin,
    FormFieldDataType.Currency,
  ]);
  const result = useRef<number | null>(null);

  const service = new Service();

  useEffect(() => {
    async function fetchData() {
      // Use the top 2000 coins instead of every coin for performance reasons -
      // getCoinList returns over 13k items which can sometimes hit the memory limit
      // for the command. It also makes the UI lag when swapping the field order
      // and makes searching the drop down more cumbersome (there are sometimes
      // coins that have the same / very similar symbols). Keeping the list to 2000
      // feels like a could comprimise between functionality and performance.
      try {
        const coins = await service.getTop2000CoinList(
          selectedCurrency.current,
        );
        setCoins(coins);

        const currencies = await service.getSupportedVsCurrencies();
        setCurrencies(currencies);
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to load data',
          message: 'Try running the command again',
        });
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const reset = () => {
    result.current = null;
  };

  const copyResultToClipboard = async () => {
    await Clipboard.copy(`${result.current}`);
    await showHUD('Copied to Clipboard');

    reset();
  };

  const onDropdownChange = (type: FormFieldDataType, value: string) => {
    const ref =
      type === FormFieldDataType.Coin ? selectedCoin : selectedCurrency;

    ref.current = value;

    reset();
  };

  const onFormSubmit = async ({ amount, from, to }: FormResult) => {
    const coin = fieldOrder[0] == FormFieldDataType.Coin ? from : to;
    const currency = fieldOrder[1] == FormFieldDataType.Currency ? to : from;

    if (isLoading) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Still loading, please wait',
      });
      return;
    }

    if (amount.trim() === '' || isNaN(Number(amount))) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Amount invalid',
      });
      return;
    }

    if (from === null) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'From field is empty',
      });
      return;
    }

    if (to === null) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'To field is empty',
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: 'Calculating...',
    });

    let price;

    try {
      price = await service.getPrice(coin, currency);
    } finally {
      if (!price) {
        toast.style = Toast.Style.Failure;
        toast.title = 'Failed to fetch price';
        // eslint-disable-next-line no-unsafe-finally
        return;
      }
    }

    let total = 0;
    let title = '';

    if (fieldOrder[0] == FormFieldDataType.Coin) {
      total = price * parseFloat(amount);
      title = `${total} ${currency.toUpperCase()}`;
    } else {
      total = parseFloat(amount) / price;
      title = `${total}`;

      const coinData = coins.find(({ id }) => id === coin) as Coin;

      title += ` ${coinData.symbol.toUpperCase()}`;
    }

    result.current = total;

    toast.style = Toast.Style.Success;
    toast.title = title;
    toast.primaryAction = {
      title: 'Copy to Clipboard',
      shortcut: {
        modifiers: ['cmd', 'shift'],
        key: 'c',
      },
      onAction: copyResultToClipboard,
    };
  };

  const coinItems = coins
    .map((coin) => {
      return {
        value: coin.id,
        title: coin.symbol.toUpperCase(),
        selected: selectedCoin.current === coin.id,
      };
    })
    // Fake the defaultValue by keeping the users selected coin at the top of
    // the list - This is needed because we cannot change defaultValue after
    // it has been set
    .sort((a, b) => Number(b.selected) - Number(a.selected));

  const currencyItems = currencies
    .map((currency) => {
      return {
        value: currency,
        title: currency.toUpperCase(),
        selected: selectedCurrency.current === currency,
      };
    })
    // Fake the defaultValue by keeping the users selected currency at the top of
    // the list - This is needed because we cannot change defaultValue after
    // it has been set
    .sort((a, b) => Number(b.selected) - Number(a.selected));

  const fromFieldItems =
    fieldOrder[0] === FormFieldDataType.Coin ? coinItems : currencyItems;
  const toFieldItems =
    fieldOrder[1] === FormFieldDataType.Currency ? currencyItems : coinItems;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={onFormSubmit} />
          <Action
            title="Copy Result to Clipboard"
            onAction={async () => {
              if (result.current === null) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: 'Nothing to copy',
                });
                return;
              }

              copyResultToClipboard();
            }}
          />
          <Action
            title="Swap Field Order"
            onAction={() => setFieldOrder([...fieldOrder.reverse()])}
            shortcut={{
              modifiers: ['cmd', 'shift'],
              key: 's',
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="amount"
        title="Amount"
        defaultValue="1"
        onChange={reset}
      />
      <Form.Dropdown
        id="from"
        title="From"
        onChange={(value) => onDropdownChange(fieldOrder[0], value)}
      >
        {fromFieldItems.map(({ value, title }, idx) => (
          <Form.Dropdown.Item key={idx} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="to"
        title="To"
        onChange={(value) => onDropdownChange(fieldOrder[1], value)}
      >
        {toFieldItems.map(({ value, title }, idx) => (
          <Form.Dropdown.Item key={idx} value={value} title={title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
