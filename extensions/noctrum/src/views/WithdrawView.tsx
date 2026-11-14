import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletData } from "../lib/wallet";
import { COINS } from "../lib/constants";
import { requestWithdraw, fetchBalances } from "../lib/external-api";
import { withdrawWithTicket } from "../lib/chain";
import { ethers } from "ethers";
import { errorMessage } from "../lib/types";

export function WithdrawView({ wallet }: { wallet: WalletData }) {
  const [token, setToken] = useState<string>(COINS[0].address);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBalances(wallet)
      .then((data) => {
        const map: Record<string, string> = {};
        for (const b of data.balances ?? []) {
          map[b.token.toLowerCase()] = b.amount;
        }
        setBalances(map);
      })
      .catch((e) => console.log(e));
  }, []);

  async function handleSubmit() {
    if (!amount) {
      showToast(Toast.Style.Failure, "Enter an amount");
      return;
    }
    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, "Step 1/2: Requesting withdraw ticket...");
    try {
      const amountWei = ethers.parseEther(amount).toString();

      // Step 1: Request ticket from external API
      const data = await requestWithdraw(wallet, token, amountWei);
      const ticket = data.ticket;
      if (!ticket) throw new Error("No ticket received");

      // Step 2: On-chain withdrawWithTicket
      toast.title = "Step 2/2: Executing on-chain withdrawal...";
      await withdrawWithTicket(wallet.privateKey, token, amountWei, ticket);

      toast.style = Toast.Style.Success;
      toast.title = "Withdrawal complete!";
    } catch (e) {
      console.log(e);
      toast.style = Toast.Style.Failure;
      toast.title = "Withdraw failed";
      toast.message = errorMessage(e);
    }
    setIsSubmitting(false);
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Withdraw" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
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
      {balances[token.toLowerCase()] && (
        <Form.Description
          title="Available Balance"
          text={`${ethers.formatEther(balances[token.toLowerCase()])} ${COINS.find((c) => c.address === token)?.symbol ?? ""}`}
        />
      )}
    </Form>
  );
}
