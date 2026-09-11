import { ActionPanel, Action, List, showToast, Toast, Icon, Color, Detail, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletService } from "./services/wallet-service";

interface Transaction {
  id: string;
  type: string;
  amount?: number;
  sender: string;
  receiver?: string;
  assetId?: number;
  assetName?: string;
  fee: number;
  round: number;
  timestamp: number;
  note?: string;
  confirmed: boolean;
}

export default function TransactionHistory() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const { push } = useNavigation();
  const walletService = WalletService.getInstance();

  useEffect(() => {
    loadTransactionHistory();
  }, []);

  const loadTransactionHistory = async () => {
    setIsLoading(true);
    try {
      const wallet = await walletService.getOrCreateWallet();
      setWalletAddress(wallet.address);

      await showToast({
        style: Toast.Style.Animated,
        title: "Loading Transactions...",
        message: "Fetching your transaction history",
      });

      const historyResponse = await walletService.getTransactionHistory(wallet.address);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedTransactions = await processTransactions(historyResponse.transactions || ([] as any[]));

      setTransactions(processedTransactions);

      await showToast({
        style: Toast.Style.Success,
        title: "Transactions Loaded",
        message: `Found ${processedTransactions.length} transactions`,
      });
    } catch (error) {
      console.error("Error loading transaction history:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load transaction history",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processTransactions = async (txns: any[]): Promise<Transaction[]> => {
    const processed: Transaction[] = [];

    for (const txn of txns) {
      try {
        const transaction: Transaction = {
          id: txn.id,
          type: walletService.formatTransactionType(txn),
          sender: txn.sender,
          fee: txn.fee,
          round: txn["confirmed-round"],
          timestamp: txn["round-time"],
          note: txn.note ? Buffer.from(txn.note, "base64").toString("utf-8") : undefined,
          confirmed: true,
        };

        // Process different transaction types
        if (txn["tx-type"] === "pay") {
          // Payment transaction
          transaction.amount = txn["payment-transaction"].amount;
          transaction.receiver = txn["payment-transaction"].receiver;
        } else if (txn["tx-type"] === "axfer") {
          // Asset transfer
          transaction.amount = txn["asset-transfer-transaction"].amount;
          transaction.receiver = txn["asset-transfer-transaction"].receiver;
          transaction.assetId = txn["asset-transfer-transaction"]["asset-id"];

          // Try to get asset info
          try {
            const assetInfo = await walletService.getAssetInfo(transaction.assetId || 0);
            if (assetInfo) {
              transaction.assetName = assetInfo.params.name || `Asset ${transaction.assetId}`;
            }
          } catch {
            transaction.assetName = `Asset ${transaction.assetId}`;
          }
        } else if (txn["tx-type"] === "acfg") {
          // Asset configuration
          if (txn["asset-config-transaction"]["asset-id"] === 0) {
            // Asset creation
            transaction.assetName = txn["asset-config-transaction"].params?.name || "Unknown Asset";
          } else {
            transaction.assetId = txn["asset-config-transaction"]["asset-id"];
            transaction.assetName = `Asset ${transaction.assetId}`;
          }
        }

        processed.push(transaction);
      } catch (error) {
        console.error("Error processing transaction:", error);
      }
    }

    return processed.sort((a, b) => b.timestamp - a.timestamp);
  };

  const getTransactionIcon = (transaction: Transaction): { source: Icon; tintColor?: Color } => {
    if (transaction.type === "Payment") {
      return transaction.sender === walletAddress
        ? { source: Icon.ArrowUp, tintColor: Color.Red }
        : { source: Icon.ArrowDown, tintColor: Color.Green };
    } else if (transaction.type === "Asset Transfer") {
      return transaction.sender === walletAddress
        ? { source: Icon.ArrowUpCircle, tintColor: Color.Orange }
        : { source: Icon.ArrowDownCircle, tintColor: Color.Blue };
    } else if (transaction.type === "Asset Creation") {
      return { source: Icon.Plus, tintColor: Color.Purple };
    } else if (transaction.type === "Asset Configuration") {
      return { source: Icon.Gear, tintColor: Color.Yellow };
    }
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  };

  const getTransactionTitle = (transaction: Transaction): string => {
    if (transaction.type === "Payment") {
      if (transaction.sender === walletAddress) {
        return `Sent ${walletService.formatAmount(transaction.amount || 0, 6)} ALGO`;
      } else {
        return `Received ${walletService.formatAmount(transaction.amount || 0, 6)} ALGO`;
      }
    } else if (transaction.type === "Asset Transfer") {
      const direction = transaction.sender === walletAddress ? "Sent" : "Received";
      return `${direction} ${transaction.amount || 0} ${transaction.assetName || "Unknown Asset"}`;
    } else if (transaction.type === "Asset Creation") {
      return `Created ${transaction.assetName || "Asset"}`;
    }
    return transaction.type;
  };

  const getTransactionSubtitle = (transaction: Transaction): string => {
    const date = new Date(transaction.timestamp * 1000).toLocaleString();
    if (transaction.type === "Payment") {
      const otherParty = transaction.sender === walletAddress ? transaction.receiver : transaction.sender;
      return `${otherParty ? `${otherParty.slice(0, 8)}...${otherParty.slice(-8)}` : "Unknown"} • ${date}`;
    } else if (transaction.type === "Asset Transfer") {
      const otherParty = transaction.sender === walletAddress ? transaction.receiver : transaction.sender;
      return `${otherParty ? `${otherParty.slice(0, 8)}...${otherParty.slice(-8)}` : "Unknown"} • ${date}`;
    }
    return `Round ${transaction.round} • ${date}`;
  };

  const getTransactionAccessory = (transaction: Transaction): string => {
    return `Fee: ${walletService.formatAmount(transaction.fee, 6)} ALGO`;
  };

  const showTransactionDetail = (transaction: Transaction) => {
    push(<TransactionDetail transaction={transaction} walletAddress={walletAddress} />);
  };

  return (
    <List navigationTitle="Transaction History" isLoading={isLoading} searchBarPlaceholder="Search transactions...">
      {transactions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.BankNote}
          title="No Transactions Found"
          description="Your transaction history will appear here once you start using your wallet."
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadTransactionHistory} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        transactions.map((transaction) => (
          <List.Item
            key={transaction.id}
            icon={getTransactionIcon(transaction)}
            title={getTransactionTitle(transaction)}
            subtitle={getTransactionSubtitle(transaction)}
            accessories={[{ text: getTransactionAccessory(transaction) }]}
            actions={
              <ActionPanel>
                <Action title="View Details" onAction={() => showTransactionDetail(transaction)} icon={Icon.Eye} />
                <Action.CopyToClipboard
                  title="Copy Transaction ID"
                  content={transaction.id}
                  icon={Icon.CopyClipboard}
                />
                <Action.OpenInBrowser
                  title="View on Algoexplorer"
                  url={`https://lora.algokit.io/testnet/transaction/${transaction.id}`}
                  icon={Icon.Globe}
                />
                <Action
                  title="Refresh"
                  onAction={loadTransactionHistory}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function TransactionDetail({ transaction, walletAddress }: { transaction: Transaction; walletAddress: string }) {
  const walletService = WalletService.getInstance();

  const getTransactionDirection = (): string => {
    if (transaction.sender === walletAddress) {
      return "Outgoing";
    } else if (transaction.receiver === walletAddress) {
      return "Incoming";
    }
    return "Unknown";
  };

  const markdown = `# Transaction Details

## 📋 Basic Information
- **Type**: ${transaction.type}
- **Direction**: ${getTransactionDirection()}
- **Status**: ✅ Confirmed
- **Round**: ${transaction.round}
- **Date**: ${new Date(transaction.timestamp * 1000).toLocaleString()}

## 💰 Transaction Details
${
  transaction.type === "Payment"
    ? `
- **Amount**: ${walletService.formatAmount(transaction.amount || 0, 6)} ALGO
- **Sender**: \`${transaction.sender}\`
- **Receiver**: \`${transaction.receiver || "N/A"}\`
`
    : transaction.type === "Asset Transfer"
      ? `
- **Asset**: ${transaction.assetName || `Asset ${transaction.assetId}`}
- **Asset ID**: ${transaction.assetId}
- **Amount**: ${transaction.amount || 0} units
- **Sender**: \`${transaction.sender}\`
- **Receiver**: \`${transaction.receiver || "N/A"}\`
`
      : transaction.type === "Asset Creation"
        ? `
- **Asset Name**: ${transaction.assetName || "Unknown"}
- **Creator**: \`${transaction.sender}\`
`
        : `
- **Sender**: \`${transaction.sender}\`
`
}

## 🔗 Blockchain Information
- **Transaction ID**: \`${transaction.id}\`
- **Fee**: ${walletService.formatAmount(transaction.fee, 6)} ALGO
- **Confirmed Round**: ${transaction.round}

${
  transaction.note
    ? `
## 📝 Note
\`\`\`
${transaction.note}
\`\`\`
`
    : ""
}

---

### 🌐 External Links
[View on AlgoExplorer](https://lora.algokit.io/testnet/transaction/${transaction.id})`;

  return (
    <Detail
      navigationTitle="Transaction Details"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Transaction ID" content={transaction.id} icon={Icon.CopyClipboard} />
          <Action.OpenInBrowser
            title="View on Algoexplorer"
            url={`https://lora.algokit.io/testnet/transaction/${transaction.id}`}
            icon={Icon.Globe}
          />
          <Action.CopyToClipboard title="Copy Sender Address" content={transaction.sender} icon={Icon.Person} />
          {transaction.receiver && (
            <Action.CopyToClipboard
              title="Copy Receiver Address"
              content={transaction.receiver}
              icon={Icon.PersonCircle}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
