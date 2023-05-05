import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useGetTokenList } from "./apis";
import { useState } from "react";
import { formatCurrency, isNumeric } from "./utils";
import axios from "axios";

type ConversionFormFields = {
  fromToken: string;
  toToken: string;
  amount: string;
};

export default function Command() {
  const { data, isLoading } = useGetTokenList();
  const tokens = data?.data ?? [];

  const [fromToken, setFromToken] = useState<string | undefined>(tokens?.[0]?.symbol.toString());
  const [toToken, setToToken] = useState<string | undefined>(tokens?.[1]?.symbol.toString());
  const [amountError, setAmountError] = useState<string | undefined>();

  async function handleSubmit(values: ConversionFormFields) {
    if (!values.amount) {
      setAmountError("The field should't be empty!");
      return;
    }

    if (!isNumeric(values.amount)) {
      setAmountError("The field must be a number");
      return;
    }

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Fetching...",
      });

      const { data } = await axios.post("https://api.indexer.console.so/api/v1/token/convert-price", {
        from: values.fromToken,
        to: values.toToken,
        amount: values.amount,
      });

      const result = data.data;
      if (!result || !result.from || !result.to) {
        showToast({
          style: Toast.Style.Failure,
          title: "Server error",
        });
        return;
      }

      showToast({
        style: Toast.Style.Success,
        title: `Convert ${result.from.amount} ${result.from.symbol} to ${result.to.symbol}`,
        message: `Result: ${formatCurrency(result.to.amount)} ${result.to.symbol}`,
      });
    } catch (error: any) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Server error",
        message: error?.message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="fromToken"
        title="From Token"
        value={fromToken}
        isLoading={isLoading}
        onChange={(newValue) => {
          if (newValue && toToken === newValue) {
            const allowList = tokens.filter((token) => token.symbol.toString() !== newValue);
            if (allowList.length > 0) {
              setToToken(allowList[0].symbol.toString());
            }
          }
          setFromToken(newValue);
        }}
      >
        {tokens.map((token) => (
          <Form.Dropdown.Item
            key={token.id.toString()}
            value={token.symbol.toString()}
            title={token.symbol.toUpperCase()}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="toToken"
        title="To Token"
        value={toToken}
        isLoading={isLoading}
        onChange={(newValue) => {
          if (newValue && fromToken === newValue) {
            const allowList = tokens.filter((token) => token.symbol.toString() !== newValue);
            if (allowList.length > 0) {
              setFromToken(allowList[0].symbol.toString());
            }
          }
          setToToken(newValue);
        }}
      >
        {tokens.map((token) => (
          <Form.Dropdown.Item key={token.id} value={token.symbol.toString()} title={token.symbol.toUpperCase()} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="Amount"
        error={amountError}
        onBlur={(event) => {
          const value = event.target.value;
          if (!value) {
            setAmountError("The field should't be empty!");
            return;
          }
          if (!isNumeric(value)) {
            setAmountError("The field must be a number");
          }
        }}
      />
    </Form>
  );
}
