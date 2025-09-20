import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  LaunchProps,
  popToRoot,
  showHUD,
  showToast,
  open,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { CodesRequester } from "./api/codes";
import Style = Toast.Style;
import { FetchError } from "ofetch";
import { useAssets } from "./hooks/use-assets";
import { useHttpClient } from "./hooks/use-http-client";

export default function Command(props: LaunchProps<{ arguments: Arguments.CodeCreate }>) {
  const args = props.arguments;

  const [ticker, setTicker] = useState(args.ticker.toUpperCase());
  const [amount, setAmount] = useState(args.amount);
  const [passphrase, setPassword] = useState(args.passphrase);

  const client = useHttpClient();

  const { assets } = useAssets(client);

  const codes = new CodesRequester(client);

  async function handleSubmit() {
    const toast = await showToast({ title: "Creating code..", style: Style.Animated });
    try {
      const result = await codes.create(ticker, amount, passphrase);

      const textContent: Clipboard.Content = {
        text: result.code,
      };
      await Clipboard.copy(textContent);

      await showHUD("Code copied to clipboard");

      toast.style = Style.Success;
      toast.title = "Code created successfully!";

      open("raycast://confetti");

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

  const [amountError, setAmountError] = useState<string | undefined>();

  function validateAmount(value?: string) {
    if (!value || value?.length == 0) {
      setAmountError("The field should't be empty!");

      return;
    }

    if (Number(value) <= 0) {
      setAmountError("The field should be grater then zero!");

      return;
    }

    setAmountError(undefined);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
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
        info="Enter desired WhiteBIT code amount"
        onChange={setAmount}
        error={amountError}
        onBlur={(event) => validateAmount(event.target.value)}
        placeholder="Code amount"
      />
      <Form.PasswordField
        id="password"
        title="Code Passphrase"
        info="You can leave this field empty and your code wouldnt be protected by passphrase"
        value={passphrase}
        onChange={setPassword}
      />
    </Form>
  );
}
