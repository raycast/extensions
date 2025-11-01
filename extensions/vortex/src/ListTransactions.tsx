import "cross-fetch/polyfill";
import { useEffect, useState } from "react";
import { fiat } from "@getalby/lightning-tools";
import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { connectWallet } from "./utils/wallet";
import ConnectionError from "./components/ConnectionError";
import getFiatValues from "./utils/getFiatValues";
import { Transaction } from "./types";

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
  const [detailsVisibility, setDetailsVisibility] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        // Ensure the wallet is connected
        const nwc = await connectWallet();

        await showToast(Toast.Style.Animated, "Loading transactions...");
        const response = await nwc.listTransactions({});
        const balanceInfo = await nwc.getBalance(); // Fetch the balance from the connected wallet
        const fiatCurrency = getPreferenceValues<{ currency: string }>().currency;
        const fiatBalance = await fiat.getFormattedFiatValue({
          satoshi: balanceInfo.balance,
          currency: fiatCurrency,
          locale: "en",
        });
        const fiatBtcRate = await fiat.getFiatBtcRate(fiatCurrency);
        const transactions = getFiatValues({
          transactionArray: response.transactions,
          currency: fiatCurrency,
          rate: fiatBtcRate,
        });

        setBalance(`${new Intl.NumberFormat().format(balanceInfo.balance)} sats`);
        setFiatBalance(fiatBalance);
        setTransactions(transactions);
        nwc.close();
        await showToast(Toast.Style.Success, "Loaded");
        setIsLoading(false);
      } catch (error) {
        setConnectionError(error);
        await showToast(Toast.Style.Failure, "Failed to fetch transactions");
      }
    }

    fetchTransactions();
  }, []);

  if (connectionError) {
    return <ConnectionError error={connectionError} />;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={detailsVisibility}
      selectedItemId={selectedTransaction?.payment_hash}
      onSelectionChange={(id) => {
        const selected = transactions.find((t) => t.payment_hash === id) || null;
        setSelectedTransaction(selected);
      }}
    >
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
          title={`${new Intl.NumberFormat().format(transaction.amount)} sats (${transaction.fiatAmount ? transaction.fiatAmount : ""})`}
          subtitle={`${transaction.description ? `for ${transaction.description}` : ""} ${
            transaction.settled_at ? new Date(transaction.settled_at * 1000).toLocaleString() : ""
          }`}
          icon={transaction.type === "incoming" ? IncomingIcon : OutgoingIcon}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Amount"
                    text={
                      (transaction.type === "incoming" ? "+" : "-") +
                      `${new Intl.NumberFormat().format(transaction.amount)} sats`
                    }
                  />
                  {transaction.fiatAmount && (
                    <List.Item.Detail.Metadata.Label
                      title="Fiat Amount"
                      text={(transaction.type === "incoming" ? "+" : "-") + `${transaction.fiatAmount}`}
                    />
                  )}

                  <List.Item.Detail.Metadata.Label
                    title="Description"
                    text={transaction.description || "No description"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Settled At"
                    text={
                      transaction.settled_at ? new Date(transaction.settled_at * 1000).toLocaleString() : "Not settled"
                    }
                  />
                  <List.Item.Detail.Metadata.Label title="Payment Hash" text={transaction.payment_hash} />
                  <List.Item.Detail.Metadata.Label title="Payment Preimage" text={transaction.preimage} />
                  <List.Item.Detail.Metadata.Label title="Fees Paid" text={`${transaction.fees_paid} sats`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel title={`Payment ${transaction.description}`}>
              <Action
                title={detailsVisibility ? "Hide Details" : "See Details"}
                onAction={() => setDetailsVisibility(!detailsVisibility)}
              />
              <Action.CopyToClipboard title="Copy Preimage" content={transaction.preimage} />
              <Action.CopyToClipboard title="Copy Payment Hash" content={transaction.payment_hash} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
