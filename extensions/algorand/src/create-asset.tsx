import { ActionPanel, Action, Detail, showToast, Toast, Icon, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { WalletService } from "./services/wallet-service";

export default function CreateAsset() {
  const [isLoading, setIsLoading] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [unitName, setUnitName] = useState("");
  const [totalSupply, setTotalSupply] = useState("");
  const [decimals, setDecimals] = useState("0");
  const [assetUrl, setAssetUrl] = useState("");
  const [defaultFrozen, setDefaultFrozen] = useState(false);
  const [result, setResult] = useState<{ assetId: number; txId: string } | null>(null);
  const { pop } = useNavigation();
  const walletService = WalletService.getInstance();

  const validateInputs = (): string | null => {
    if (!assetName.trim()) {
      return "Asset name is required";
    }

    if (!unitName.trim()) {
      return "Unit name is required";
    }

    if (unitName.length > 8) {
      return "Unit name must be 8 characters or less";
    }

    if (!totalSupply) {
      return "Total supply is required";
    }

    const supply = parseInt(totalSupply);
    if (isNaN(supply) || supply <= 0) {
      return "Total supply must be a positive integer";
    }

    if (supply > Number.MAX_SAFE_INTEGER) {
      return "Total supply exceeds maximum allowed value";
    }

    const decimalsNum = parseInt(decimals);
    if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 19) {
      return "Decimals must be between 0 and 19";
    }

    if (assetUrl && assetUrl.length > 96) {
      return "Asset URL must be 96 characters or less";
    }

    return null;
  };

  const createAsset = async () => {
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
        title: "Creating Asset...",
        message: "Please wait while we create your Algorand Standard Asset",
      });

      const wallet = await walletService.getOrCreateWallet();
      const supply = parseInt(totalSupply);
      const decimalsNum = parseInt(decimals);

      const assetResult = await walletService.createAsset(
        wallet.mnemonic,
        assetName.trim(),
        unitName.trim().toUpperCase(),
        supply,
        decimalsNum,
        defaultFrozen,
        assetUrl.trim() || undefined,
      );

      setResult(assetResult);

      await showToast({
        style: Toast.Style.Success,
        title: "Asset Created!",
        message: `Asset ID: ${assetResult.assetId}`,
      });
    } catch (error) {
      console.error("Error creating asset:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Asset Creation Failed",
        message: error instanceof Error ? error.message : "Failed to create asset",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    const markdown = `# ✅ Asset Created Successfully!

## Asset Details
- **Asset ID**: \`${result.assetId}\`
- **Name**: ${assetName}
- **Unit Name**: ${unitName.toUpperCase()}
- **Total Supply**: ${parseInt(totalSupply).toLocaleString()}
- **Decimals**: ${decimals}
- **Default Frozen**: ${defaultFrozen ? "Yes" : "No"}
- **URL**: ${assetUrl || "None"}

## Transaction Details
- **Transaction ID**: \`${result.txId}\`

## 🌐 View Asset
[View on AlgoExplorer](https://lora.algokit.io/testnet/asset/${result.assetId})

---

Your Algorand Standard Asset (ASA) has been successfully created on the testnet! You are now the manager, reserve, freeze, and clawback address for this asset.

### Next Steps:
1. **Share the Asset ID** with others who want to opt-in to your asset
2. **Transfer assets** to other addresses (they must opt-in first)
3. **Manage asset properties** using your creator privileges`;

    return (
      <Detail
        navigationTitle="Asset Created"
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Asset ID"
              content={result.assetId.toString()}
              icon={Icon.CopyClipboard}
            />
            <Action.CopyToClipboard title="Copy Transaction ID" content={result.txId} icon={Icon.Document} />
            <Action.OpenInBrowser
              title="View on Algoexplorer"
              url={`https://lora.algokit.io/testnet/asset/${result.assetId}`}
              icon={Icon.Globe}
            />
            <Action
              title="Create Another Asset"
              onAction={() => {
                setResult(null);
                setAssetName("");
                setUnitName("");
                setTotalSupply("");
                setDecimals("0");
                setAssetUrl("");
                setDefaultFrozen(false);
              }}
              icon={Icon.Plus}
            />
            <Action title="Back to Wallet" onAction={pop} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Create Algorand Asset"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Create Asset" onAction={createAsset} icon={Icon.Plus} />
          <Action title="Cancel" onAction={pop} icon={Icon.XMarkCircle} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="assetName"
        title="Asset Name"
        placeholder="Enter asset name (e.g., My Token)"
        value={assetName}
        onChange={setAssetName}
      />

      <Form.TextField
        id="unitName"
        title="Unit Name"
        placeholder="Enter unit symbol (max 8 chars, e.g., MTK)"
        value={unitName}
        onChange={setUnitName}
        error={unitName.length > 8 ? "Unit name must be 8 characters or less" : undefined}
      />

      <Form.TextField
        id="totalSupply"
        title="Total Supply"
        placeholder="Enter total supply (e.g., 1000000)"
        value={totalSupply}
        onChange={setTotalSupply}
        error={
          totalSupply && (isNaN(parseInt(totalSupply)) || parseInt(totalSupply) <= 0)
            ? "Total supply must be a positive integer"
            : undefined
        }
      />

      <Form.Dropdown id="decimals" title="Decimals" value={decimals} onChange={setDecimals}>
        {Array.from({ length: 20 }, (_, i) => (
          <Form.Dropdown.Item key={i} value={i.toString()} title={`${i} decimal${i !== 1 ? "s" : ""}`} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="assetUrl"
        title="Asset URL (Optional)"
        placeholder="https://example.com/asset-info (max 96 chars)"
        value={assetUrl}
        onChange={setAssetUrl}
        error={assetUrl.length > 96 ? "URL must be 96 characters or less" : undefined}
      />

      <Form.Checkbox
        id="defaultFrozen"
        title="Default Frozen"
        label="Start with assets frozen for all holders"
        value={defaultFrozen}
        onChange={setDefaultFrozen}
      />

      <Form.Separator />

      <Form.Description text="💡 Asset Properties:" />
      <Form.Description text="• You will be the manager, reserve, freeze, and clawback address" />
      <Form.Description text="• Users must opt-in to your asset before receiving it" />
      <Form.Description text="• Asset creation requires a small transaction fee" />

      <Form.Separator />

      <Form.Description text="⚠️ Important: Asset properties cannot be changed after creation. Double-check all details!" />
    </Form>
  );
}
