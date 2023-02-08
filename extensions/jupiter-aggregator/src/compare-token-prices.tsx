import { Clipboard, Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { fetchTokenList, compareTokens } from "./api";
import { useState } from "react";

export default function Command() {
  const { data, isLoading } = fetchTokenList();
  const [token1, setToken1] = useState("SOL");
  const [token2, setToken2] = useState("USDC");
  const [amount, setAmount] = useState("1");

  const submitHander = async () => {
    const price = await compareTokens(token1, amount, token2);
    await showToast({
      style: Toast.Style.Success,
      title: `${price}`,
      message: "Copied to Clipboard",
    });
    await Clipboard.copy(price);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={submitHander} title="Calculate" />
        </ActionPanel>
      }
    >
      <Form.TextField title="Amount" id="amount" onChange={setAmount} value={amount} />

      <Form.Dropdown
        id="token1"
        title="From"
        info="Search by symbol, name, or address"
        value={token1}
        onChange={setToken1}
        isLoading={isLoading}
      >
        {data &&
          Array.isArray(data) &&
          data.map((item: any, index: number) => (
            <Form.Dropdown.Item
              key={index + item.symbol}
              value={item.symbol}
              title={item.symbol}
              keywords={[item.name, item.symbol, item.address]}
              icon={item.logoURI}
            />
          ))}
      </Form.Dropdown>
      <Form.Dropdown id="token2" title="To" value={token2} onChange={setToken2} isLoading={isLoading}>
        {data &&
          Array.isArray(data) &&
          data.map((item: any, index: number) => (
            <Form.Dropdown.Item
              key={index + item.symbol}
              value={item.symbol}
              title={item.symbol}
              keywords={[item.name, item.symbol, item.address]}
              icon={item.logoURI}
            />
          ))}
      </Form.Dropdown>
    </Form>
  );
}
