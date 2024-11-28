import "cross-fetch/polyfill";
import { useEffect, useState } from "react";
import { fiat } from "@getalby/lightning-tools";
import { List, showToast, Toast, Icon, ActionPanel, Action, Color, getPreferenceValues } from "@raycast/api";
import { connectWallet } from "./wallet";
import ConnectionError from "./ConnectionError";

export type Transaction = {
  type: string;
  invoice: string;
  description: string;
  description_hash: string;
  preimage: string;
  payment_hash: string;
  amount: number;
  fees_paid: number;
  settled_at: number;
  created_at: number;
  expires_at: number;
  metadata?: Record<string, unknown>;
};

const IncomingIcon = {
  source: Icon.ArrowDown,
  tintColor: Color.Green,
};
const OutgoingIcon = {
  source: Icon.ArrowUp,
  tintColor: Color.Red,
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<string | null>(null);
  const [fiatBalance, setFiatBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<unknown>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        // Ensure the wallet is connected
        const nwc = await connectWallet();

        showToast(Toast.Style.Animated, "Loading transactions...");
        const response = await nwc.listTransactions({});
        const balanceInfo = await nwc.getBalance(); // Fetch the balance from the connected wallet
        const fiatCurrency = getPreferenceValues<{ currency: string }>().currency;
        const fiatBalance = await fiat.getFormattedFiatValue({
          satoshi: balanceInfo.balance,
          currency: fiatCurrency,
          locale: "en",
        });
        setBalance(`${new Intl.NumberFormat().format(balanceInfo.balance)} sats`);
        setFiatBalance(fiatBalance);
        setTransactions(response.transactions);
        nwc.close();
        showToast(Toast.Style.Success, "Loaded");
        setIsLoading(false);
      } catch (error) {
        setConnectionError(error);
        showToast(Toast.Style.Failure, "Failed to fetch transactions");
      }
    }

    fetchTransactions();
  }, []);

  if (connectionError) {
    return <ConnectionError error={connectionError} />;
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && (
        <List.Item
          key="balane"
          title={`Balance: ${balance} (${fiatBalance})`}
          icon={{ source: Icon.Wallet, tintColor: Color.Green }}
        />
      )}
      {transactions.map((transaction) => (
        <List.Item
          key={transaction.payment_hash}
          title={`${new Intl.NumberFormat().format(transaction.amount)} sats`}
          subtitle={`${transaction.description ? `for ${transaction.description}` : ""} ${
            transaction.settled_at ? new Date(transaction.settled_at * 1000).toLocaleString() : ""
          }`}
          icon={transaction.type === "incoming" ? IncomingIcon : OutgoingIcon}
          actions={
            <ActionPanel title={`Payment ${transaction.description}`}>
              <Action.CopyToClipboard title="Copy Preimage" content={transaction.preimage} />
              <Action.CopyToClipboard title="Copy Payment Hash" content={transaction.payment_hash} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
