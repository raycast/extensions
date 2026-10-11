import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { WalletData } from "../lib/wallet";
import { COINS } from "../lib/constants";
import { privateTransfer } from "../lib/external-api";
import { ethers } from "ethers";
import { errorMessage } from "../lib/types";

export function TransferView({ wallet }: { wallet: WalletData }) {
  const [recipient, setRecipient] = useState("");
  const [token, setToken] = useState<string>(COINS[0].address);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!recipient || !amount) {
      showToast(Toast.Style.Failure, "Fill all fields");
      return;
    }
    if (!ethers.isAddress(recipient)) {
      showToast(Toast.Style.Failure, "Invalid recipient address");
      return;
    }
    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, "Sending private transfer...");
    try {
      const amountWei = ethers.parseEther(amount).toString();
      await privateTransfer(wallet, recipient, token, amountWei);
      toast.style = Toast.Style.Success;
      toast.title = "Transfer sent!";
    } catch (e) {
      console.log(e);
      toast.style = Toast.Style.Failure;
      toast.title = "Transfer failed";
      toast.message = errorMessage(e);
    }
    setIsSubmitting(false);
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Transfer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="recipient" title="Recipient" placeholder="0x..." value={recipient} onChange={setRecipient} />
      <Form.Dropdown id="token" title="Token" value={token} onChange={setToken}>
        {COINS.map((c) => (
          <Form.Dropdown.Item
            key={c.address}
            value={c.address}
            title={c.symbol}
            icon={{ source: c.symbol === "nUSD" ? "nusd.png" : "neth.png" }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="amount" title="Amount" placeholder="e.g. 100" value={amount} onChange={setAmount} />
    </Form>
  );
}
