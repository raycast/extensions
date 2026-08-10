import { Action, ActionPanel, Form, LaunchProps, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import Style = Toast.Style;
import { FetchError } from "ofetch";
import { useAssets } from "./hooks/use-assets";
import { useHttpClient } from "./hooks/use-http-client";
import { BalanceRequester, MainBalanceResponse, TradeBalanceResponse } from "./api/balance";

export default function Command(props: LaunchProps<{ arguments: Arguments.TransferBalance }>) {
  const args = props.arguments;

  const [ticker, setTicker] = useState(args.ticker.toUpperCase());
  const [amount, setAmount] = useState(args.amount);

  const client = useHttpClient();

  const { assets } = useAssets(client);

  const balances = ["main", "spot", "collateral"];

  const [fromBalance, setFromBalance] = useState<string>("main");
  const [toBalance, setToBalance] = useState<string>("spot");

  async function handleSubmit() {
    const toast = await showToast({ title: "Making transfer...", style: Style.Animated });
    try {
      await balanceRequester.transfer({
        amount,
        ticker,
        from: fromBalance,
        to: toBalance,
      });

      const successText = "Transfer sent to queue!";
      await showHUD(successText);

      toast.style = Style.Success;
      toast.title = successText;

      await popToRoot();
    } catch (e) {
      let message = "Unexpected error occurs";
      if (e instanceof FetchError) {
        message = e.message;

        const payload = e.response?._data;

        if (payload && payload.errors) {
          const errors = Object.values(payload.errors) as Array<Array<string>>;

          message = errors[0][0] || message;
        }
      }

      toast.title = "Error";
      toast.style = Style.Failure;
      toast.message = message;
    }
  }

  const [tickerError, setTickerError] = useState<string | undefined>();

  function validateTicker(value?: string) {
    if (value?.length == 0) {
      setTickerError("The field should't be empty!");
    } else {
      setTickerError(undefined);
    }
  }

  const [mainBalances, setMainBalances] = useState<MainBalanceResponse>({});
  const [tradeBalances, setTradeBalances] = useState<TradeBalanceResponse>({});
  const [collateralBalances, setCollateralBalances] = useState<CollateralBalance>({});

  const httpClient = useHttpClient();
  const balanceRequester = new BalanceRequester(httpClient);

  useEffect(() => {
    balanceRequester
      .main()
      .then((result) => {
        setMainBalances(result);

        balanceRequester
          .trade()
          .then((result) => {
            setTradeBalances(result);

            balanceRequester
              .collateral()
              .then((result) => {
                setCollateralBalances(result);
              })
              .catch(async (err) => {
                await showToast(Style.Failure, err.message);
              });
          })
          .catch(async (err) => {
            await showToast(Style.Failure, err.message);
          });
      })
      .catch(async (err) => {
        await showToast(Style.Failure, err.message);
      });
  }, []);

  useEffect(() => {
    if (fromBalance === toBalance) {
      setToBalance(balances.filter((balance) => fromBalance !== balance)[0]);
    }
  }, [fromBalance]);

  useEffect(() => {
    if (fromBalance === toBalance) {
      setFromBalance(balances.filter((balance) => toBalance !== balance)[0]);
    }
  }, [toBalance]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="from" title="From" value={fromBalance} onChange={(balance) => setFromBalance(balance)}>
        {balances.map((balance) => (
          <Form.Dropdown.Item key={`from-${balance}`} value={balance} title={balance} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="to" title="To" value={toBalance} onChange={(balance) => setToBalance(balance)}>
        {balances.map((balance) => (
          <Form.Dropdown.Item key={`from-${balance}`} value={balance} title={balance} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="ticker"
        title="Currency"
        error={tickerError}
        onChange={(ticker) => setTicker(ticker)}
        onBlur={(event) => validateTicker(event.target.value)}
        value={ticker}
      >
        {Object.keys(assets).map((asset) => (
          <Form.Dropdown.Item key={asset} value={asset} title={asset} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="amount"
        title="Amount"
        value={amount}
        info="Enter transfer amount"
        onChange={setAmount}
        placeholder="Amonut"
      />
      {mainBalances && mainBalances[ticker] && (
        <Form.Description
          title="Current Main Balance"
          text={`${mainBalances[ticker].main_balance} ${ticker}`}
        ></Form.Description>
      )}
      {tradeBalances && tradeBalances[ticker] && (
        <Form.Description
          title="Current Trade Balance"
          text={`${tradeBalances[ticker].available} ${ticker}`}
        ></Form.Description>
      )}
      {collateralBalances && collateralBalances[ticker] && (
        <Form.Description
          title="Current Collateral Balance"
          text={`${collateralBalances[ticker]} ${ticker}`}
        ></Form.Description>
      )}
    </Form>
  );
}
