import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  showHUD,
  showToast,
  Toast,
} from '@raycast/api';
import { AxiosError } from 'axios';
import Fuse from 'fuse.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import Service, { Coin } from './service';
import {
  Currency,
  formatPrice,
  getCurrencies,
  getPreferredCurrency,
} from './utils';

const noop = () => ({});

enum FormFieldDataType {
  Coin,
  Currency,
}

interface FormResult {
  amount: string;
  from: string;
  to: string;
}

const fuse = new Fuse<Coin>([], {
  keys: ['name', 'symbol'],
  threshold: 0.5,
});

export default function Command() {
  const DEFAULT_COIN = 'bitcoin';
  const { id: DEFAULT_CURRENCY } = getPreferredCurrency();

  const [isLoading, setLoading] = useState<boolean>(true);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [coinFilter, setCoinFilter] = useState<string>('');
  const currencies = getCurrencies();
  const selectedCoin = useRef<string>(DEFAULT_COIN);
  const selectedCurrency = useRef<string>(DEFAULT_CURRENCY);
  const [fieldOrder, setFieldOrder] = useState<FormFieldDataType[]>([
    FormFieldDataType.Coin,
    FormFieldDataType.Currency,
  ]);
  const result = useRef<[number, string]>([0, '']);

  const service = new Service();

  const filteredCoins = useMemo(() => {
    if (coinFilter === '') {
      return coins;
    }

    return fuse.search(coinFilter, { limit: 40 }).map(({ item }) => item);
  }, [coinFilter, coins]);

  useEffect(() => fuse.setCollection(coins), [coins]);

  useEffect(() => {
    async function fetchData() {
      try {
        const coins = await service.getCoinList();
        setCoins(coins);
      } catch (err) {
        let errMsg = 'Try running the command again';

        if (err instanceof AxiosError && err.response) {
          const { status, headers } = err.response;

          if (status === 429) {
            const retryAfter = headers['retry-after'];

            if (retryAfter) {
              errMsg = `Too many requests, try again in ${retryAfter} seconds`;
            } else {
              errMsg = 'Too many requests, try again later';
            }
          }
        }

        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to load data',
          message: errMsg,
        });
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const reset = () => {
    result.current = [0, ''];
  };

  const copyResultToClipboard = async (unformatted = false) => {
    const value = unformatted ? `${result.current[0]}` : result.current[1];
    await Clipboard.copy(value);

    let msg = 'Copied to Clipboard';

    if (unformatted) {
      msg += ' (Without Formatting)';
    }

    await showHUD(msg);

    reset();
  };

  const onFilterCoins = (query: string) => {
    setCoinFilter(query);
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
    let totalFormatted = '';

    if (fieldOrder[0] == FormFieldDataType.Coin) {
      total = price * parseFloat(amount);

      const currencyData = currencies.find(
        ({ id }) => id === currency,
      ) as Currency;

      totalFormatted = formatPrice(total, currencyData.symbol);
    } else {
      total = parseFloat(amount) / price;

      const coinData = coins.find(({ id }) => id === coin) as Coin;

      totalFormatted = formatPrice(total, coinData.symbol);
    }

    result.current = [total, totalFormatted];

    toast.style = Toast.Style.Success;
    toast.title = totalFormatted;
    toast.primaryAction = {
      title: 'Copy',
      onAction: () => copyResultToClipboard(),
    };
    toast.secondaryAction = {
      title: 'Copy Without Formatting',
      onAction: () => copyResultToClipboard(true),
    };
  };

  const coinItems = filteredCoins
    .map((coin) => {
      return {
        value: coin.id,
        title: `${coin.name} (${coin.symbol.toUpperCase()})`,
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
        value: currency.id,
        title: `${currency.name} (${currency.symbol})`,
        selected: selectedCurrency.current === currency.id,
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
            title="Copy Result"
            onAction={async () => {
              if (result.current[1] === '') {
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
            title="Copy Result Without Formatting"
            onAction={async () => {
              if (result.current[1] === '') {
                await showToast({
                  style: Toast.Style.Failure,
                  title: 'Nothing to copy',
                });
                return;
              }

              copyResultToClipboard(true);
            }}
            shortcut={{
              modifiers: ['cmd', 'shift'],
              key: 'x',
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
        filtering={fieldOrder[0] === FormFieldDataType.Currency ? true : false}
        onSearchTextChange={
          fieldOrder[0] === FormFieldDataType.Coin ? onFilterCoins : noop
        }
      >
        {fromFieldItems.map(({ value, title }, idx) => (
          <Form.Dropdown.Item key={idx} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="to"
        title="To"
        onChange={(value) => onDropdownChange(fieldOrder[1], value)}
        filtering={fieldOrder[1] === FormFieldDataType.Currency ? true : false}
        onSearchTextChange={
          fieldOrder[1] === FormFieldDataType.Coin ? onFilterCoins : noop
        }
      >
        {toFieldItems.map(({ value, title }, idx) => (
          <Form.Dropdown.Item key={idx} value={value} title={title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
