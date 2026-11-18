import { ActionPanel, Action, Detail, showToast, Toast, Icon, Form, useNavigation, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { WalletService } from "./services/wallet-service";
import algosdk from "algosdk";

interface SendAlgoArguments {
  toAddress: string;
  amount: string;
  note?: string;
}

export default function SendAlgo(props: LaunchProps<{ arguments: SendAlgoArguments }>) {
  const { toAddress = "", amount = "", note = "" } = props.arguments;
  const [isLoading, setIsLoading] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState(toAddress);
  const [sendAmount, setSendAmount] = useState(amount);
  const [transactionNote, setTransactionNote] = useState(note);
  const [result, setResult] = useState<{ txId: string; confirmedRound: number } | null>(null);
  const { pop } = useNavigation();
  const walletService = WalletService.getInstance();

  const validateInputs = (): string | null => {
    if (!recipientAddress) {
      return "Recipient address is required";
    }

    if (!algosdk.isValidAddress(recipientAddress)) {
      return "Invalid Algorand address";
    }

    if (!sendAmount) {
      return "Amount is required";
    }

    const amountNum = parseFloat(sendAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return "Amount must be a positive number";
    }

    if (amountNum < 0.001) {
      return "Minimum amount is 0.001 ALGO";
    }

    return null;
  };

  const sendTransaction = async () => {
    const validationError = validateInputs();
    if (validationError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: validationError,
      });
      return;
    }

    setIsLoading(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Sending Transaction...",
        message: "Please wait while we process your transaction",
      });

      const wallet = await walletService.getOrCreateWallet();
      const amountNum = parseFloat(sendAmount);

      const txResult = await walletService.sendPayment(
        wallet.mnemonic,
        recipientAddress,
        amountNum,
        transactionNote || undefined,
      );

      setResult(txResult);

      await showToast({
        style: Toast.Style.Success,
        title: "Transaction Sent!",
        message: `${sendAmount} ALGO sent successfully`,
      });
    } catch (error) {
      console.error("Error sending transaction:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Transaction Failed",
        message: error instanceof Error ? error.message : "Failed to send transaction",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    const markdown = `# ✅ Transaction Successful!

## Transaction Details
- **Transaction ID**: \`${result.txId}\`
- **Amount**: ${sendAmount} ALGO
- **Recipient**: \`${recipientAddress}\`
- **Confirmed Round**: ${result.confirmedRound}
- **Note**: ${transactionNote || "None"}

## 🌐 View Transaction
[View on AlgoExplorer](https://lora.algokit.io/testnet/transaction/${result.txId})

---

Your ALGO has been successfully sent to the recipient address. The transaction has been confirmed on the Algorand testnet.`;

    return (
      <Detail
        navigationTitle="Transaction Complete"
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Transaction ID" content={result.txId} icon={Icon.CopyClipboard} />
            <Action.OpenInBrowser
              title="View on Algoexplorer"
              url={`https://lora.algokit.io/testnet/transaction/${result.txId}`}
              icon={Icon.Globe}
            />
            <Action
              title="Send Another Transaction"
              onAction={() => {
                setResult(null);
                setRecipientAddress("");
                setSendAmount("");
                setTransactionNote("");
              }}
              icon={Icon.ArrowRight}
            />
            <Action title="Back to Wallet" onAction={pop} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Send ALGO"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Send Transaction" onAction={sendTransaction} icon={Icon.ArrowRight} />
          <Action title="Cancel" onAction={pop} icon={Icon.XMarkCircle} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="recipientAddress"
        title="Recipient Address"
        placeholder="Enter Algorand address (58 characters)"
        value={recipientAddress}
        onChange={setRecipientAddress}
        error={recipientAddress && !algosdk.isValidAddress(recipientAddress) ? "Invalid address" : undefined}
      />

      <Form.TextField
        id="amount"
        title="Amount (ALGO)"
        placeholder="Enter amount in ALGO (e.g., 1.5)"
        value={sendAmount}
        onChange={setSendAmount}
        error={
          sendAmount && (isNaN(parseFloat(sendAmount)) || parseFloat(sendAmount) <= 0)
            ? "Amount must be a positive number"
            : undefined
        }
      />

      <Form.TextField
        id="note"
        title="Transaction Note (Optional)"
        placeholder="Optional note for this transaction"
        value={transactionNote}
        onChange={setTransactionNote}
      />

      <Form.Description text="⚠️ Make sure the recipient address is correct. Transactions on the blockchain cannot be reversed!" />

      <Form.Separator />

      <Form.Description text="💡 Tip: This transaction will be sent on the Algorand testnet. Make sure your wallet has sufficient balance including the transaction fee (0.001 ALGO)." />
    </Form>
  );
}
