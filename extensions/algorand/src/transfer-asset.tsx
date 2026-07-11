import { ActionPanel, Action, Detail, showToast, Toast, Icon, Form, useNavigation, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { WalletService } from "./services/wallet-service";
import algosdk from "algosdk";

interface TransferAssetArguments {
  toAddress: string;
  assetId: string;
  amount: string;
}

export default function TransferAsset(props: LaunchProps<{ arguments: TransferAssetArguments }>) {
  const { toAddress = "", assetId = "", amount = "" } = props.arguments;
  const [isLoading, setIsLoading] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState(toAddress);
  const [transferAssetId, setTransferAssetId] = useState(assetId);
  const [transferAmount, setTransferAmount] = useState(amount);
  const [transactionNote, setTransactionNote] = useState("");
  const [result, setResult] = useState<{ txId: string } | null>(null);
  const { pop } = useNavigation();
  const walletService = WalletService.getInstance();

  const validateInputs = (): string | null => {
    if (!recipientAddress) {
      return "Recipient address is required";
    }

    if (!algosdk.isValidAddress(recipientAddress)) {
      return "Invalid Algorand address";
    }

    if (!transferAssetId) {
      return "Asset ID is required";
    }

    const assetIdNum = parseInt(transferAssetId);
    if (isNaN(assetIdNum) || assetIdNum <= 0) {
      return "Asset ID must be a positive integer";
    }

    if (!transferAmount) {
      return "Amount is required";
    }

    const amountNum = parseInt(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return "Amount must be a positive integer";
    }

    return null;
  };

  const transferAsset = async () => {
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
        title: "Transferring Asset...",
        message: "Please wait while we process your asset transfer",
      });

      const wallet = await walletService.getOrCreateWallet();
      const assetIdNum = parseInt(transferAssetId);
      const amountNum = parseInt(transferAmount);

      const txResult = await walletService.transferAsset(
        wallet.mnemonic,
        recipientAddress,
        assetIdNum,
        amountNum,
        transactionNote || undefined,
      );

      setResult(txResult);

      await showToast({
        style: Toast.Style.Success,
        title: "Asset Transferred!",
        message: `${transferAmount} units of asset ${transferAssetId} sent successfully`,
      });
    } catch (error) {
      console.error("Error transferring asset:", error);
      let errorMessage = "Failed to transfer asset";

      if (error instanceof Error) {
        if (error.message.includes("asset not found")) {
          errorMessage = "Asset not found. Check the Asset ID.";
        } else if (error.message.includes("insufficient")) {
          errorMessage = "Insufficient asset balance or ALGO for transaction fee.";
        } else if (error.message.includes("not opted in")) {
          errorMessage = "Recipient has not opted into this asset.";
        } else {
          errorMessage = error.message;
        }
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Transfer Failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    const markdown = `# ✅ Asset Transfer Successful!

## Transfer Details
- **Transaction ID**: \`${result.txId}\`
- **Asset ID**: ${transferAssetId}
- **Amount**: ${transferAmount} units
- **Recipient**: \`${recipientAddress}\`
- **Note**: ${transactionNote || "None"}

## 🌐 View Transaction
[View on AlgoExplorer](https://lora.algokit.io/testnet/transaction/${result.txId})

---

Your asset has been successfully transferred to the recipient address. The transaction has been confirmed on the Algorand testnet.

### Important Notes:
- The recipient must have opted into this asset to receive it
- Asset transfers are irreversible once confirmed`;

    return (
      <Detail
        navigationTitle="Transfer Complete"
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
              title="Transfer Another Asset"
              onAction={() => {
                setResult(null);
                setRecipientAddress("");
                setTransferAssetId("");
                setTransferAmount("");
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
      navigationTitle="Transfer Asset"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Transfer Asset" onAction={transferAsset} icon={Icon.ArrowRight} />
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
        id="assetId"
        title="Asset ID"
        placeholder="Enter the Asset ID (e.g., 123456)"
        value={transferAssetId}
        onChange={setTransferAssetId}
        error={
          transferAssetId && (isNaN(parseInt(transferAssetId)) || parseInt(transferAssetId) <= 0)
            ? "Asset ID must be a positive integer"
            : undefined
        }
      />

      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="Enter amount to transfer (whole units)"
        value={transferAmount}
        onChange={setTransferAmount}
        error={
          transferAmount && (isNaN(parseInt(transferAmount)) || parseInt(transferAmount) <= 0)
            ? "Amount must be a positive integer"
            : undefined
        }
      />

      <Form.TextField
        id="note"
        title="Transaction Note (Optional)"
        placeholder="Optional note for this transfer"
        value={transactionNote}
        onChange={setTransactionNote}
      />

      <Form.Separator />

      <Form.Description text="⚠️ Important Requirements:" />
      <Form.Description text="• The recipient must have opted into this asset" />
      <Form.Description text="• You must own sufficient units of this asset" />
      <Form.Description text="• A small ALGO fee is required for the transaction" />

      <Form.Separator />

      <Form.Description text="💡 Tip: Asset transfers are irreversible. Double-check the recipient address and amount before sending!" />
    </Form>
  );
}
