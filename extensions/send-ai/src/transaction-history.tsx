import { List, showToast, Toast, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import { withAccessToken } from "@raycast/utils";
import { Transaction, TransactionHistoryResponse } from "./type";

function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>("");

  useEffect(() => {
    fetchTransactionHistory();
  }, []);

  async function fetchTransactionHistory() {
    try {
      setIsLoading(true);
      const walletAddress = await executeAction("getWalletAddress", {}, true, 1000 * 60 * 60 * 24);
      const result = (await executeAction("getTransactionHistory", {}, false)) as TransactionHistoryResponse;

      if (result.status === "success") {
        setTransactions(result.data);
        setWalletAddress(walletAddress.data?.toString() || "");
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to fetch transaction history",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to fetch transaction history",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getTransactionIcon(type: string): Icon {
    switch (type.toLowerCase()) {
      case "transfer":
        return Icon.ArrowRight;
      case "swap":
        return Icon.Switch;
      case "token_mint":
        return Icon.Plus;
      default:
        return Icon.Circle;
    }
  }

  function getTransactionColor(status: string): Color {
    return status === "success" ? Color.Green : Color.Red;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search transactions...">
      {transactions.map((transaction) => (
        <List.Item
          key={transaction.signature}
          title={transaction.description
            .replace(new RegExp(`${walletAddress}\\s*`), "")
            .replace(new RegExp("minted"), "launched")}
          accessories={[
            {
              text: transaction.type,
              icon: {
                source: getTransactionIcon(transaction.type),
                tintColor: getTransactionColor(transaction.status),
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View on Solscan"
                url={`https://solscan.io/tx/${transaction.signature}`}
                icon={Icon.Globe}
              />
              <Action.CopyToClipboard title="Copy Transaction Signature" content={transaction.signature} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withAccessToken(provider)(TransactionHistory);
