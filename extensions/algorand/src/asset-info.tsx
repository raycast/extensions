import { ActionPanel, Action, Detail, showToast, Toast, Icon, Form, useNavigation, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletService } from "./services/wallet-service";

interface AssetInfo {
  id: number;
  params: {
    name: string;
    unitName: string;
    total: number;
    decimals: number;
    defaultFrozen: boolean;
    url?: string;
    metadataHash?: string;
    manager?: string;
    reserve?: string;
    freeze?: string;
    clawback?: string;
    creator: string;
  };
  createdAtRound: number | null;
  deleted: boolean;
}

export default function AssetInfo(props: LaunchProps<{ arguments: { assetId: string } }>) {
  const { assetId = "" } = props.arguments;
  const [isLoading, setIsLoading] = useState(false);
  const [inputAssetId, setInputAssetId] = useState(assetId);
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [error, setError] = useState<string>("");
  const { pop } = useNavigation();
  const walletService = WalletService.getInstance();

  useEffect(() => {
    if (assetId) {
      fetchAssetInfo(assetId);
    }
  }, [assetId]);

  const validateAssetId = (id: string): boolean => {
    const assetIdNum = parseInt(id);
    return !isNaN(assetIdNum) && assetIdNum > 0;
  };

  const fetchAssetInfo = async (id?: string) => {
    const targetId = id || inputAssetId;

    if (!targetId) {
      setError("Asset ID is required");
      return;
    }

    if (!validateAssetId(targetId)) {
      setError("Asset ID must be a positive integer");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Fetching Asset Info...",
        message: `Getting information for Asset ${targetId}`,
      });

      const info = await walletService.getAssetInfo(parseInt(targetId));
      console.log("Asset info received:", info); // Debug logging
      setAssetInfo(info);

      await showToast({
        style: Toast.Style.Success,
        title: "Asset Info Retrieved",
        message: `Found asset: ${info.params?.name || "Unnamed Asset"}`,
      });
    } catch (error) {
      console.error("Error fetching asset info:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch asset information";
      setError(errorMessage);

      await showToast({
        style: Toast.Style.Failure,
        title: "Asset Not Found",
        message: errorMessage,
      });
      setAssetInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSupply = (total: number, decimals: number): string => {
    if (decimals === 0) {
      return total.toLocaleString();
    }
    const divisor = Math.pow(10, decimals);
    return (total / divisor).toLocaleString();
  };

  if (assetInfo) {
    const markdown = `# 🎯 Asset Information

## 📋 Basic Details
- **Asset ID**: ${assetInfo.id}
- **Name**: ${assetInfo.params.name || "Unnamed Asset"}
- **Unit Name**: ${assetInfo.params.unitName || "N/A"}
- **Status**: ${assetInfo.deleted ? "🔴 Deleted" : "🟢 Active"}

## 💰 Supply Information
- **Total Supply**: ${formatSupply(assetInfo.params.total, assetInfo.params.decimals)}
- **Decimals**: ${assetInfo.params.decimals}
- **Default Frozen**: ${assetInfo.params.defaultFrozen ? "🔒 Yes" : "🔓 No"}

## 🔗 Metadata
${assetInfo.params.url ? `- **URL**: [${assetInfo.params.url}](${assetInfo.params.url})` : "- **URL**: Not provided"}
${assetInfo.params.metadataHash ? `- **Metadata Hash**: \`${assetInfo.params.metadataHash}\`` : "- **Metadata Hash**: Not provided"}

## 👥 Asset Roles
- **Creator**: \`${assetInfo.params.creator}\`
- **Manager**: \`${assetInfo.params.manager || "Not Set"}\`
- **Reserve**: \`${assetInfo.params.reserve || "Not Set"}\`
- **Freeze**: \`${assetInfo.params.freeze || "Not Set"}\`
- **Clawback**: \`${assetInfo.params.clawback || "Not Set"}\`

## 🏗️ Creation Details
- **Created at Round**: ${assetInfo.createdAtRound ? assetInfo.createdAtRound.toLocaleString() : "Unknown"}
- **Network**: Algorand Testnet

---

### 🔍 Role Explanations:
- **Manager**: Can change asset configuration
- **Reserve**: Controls non-minted tokens
- **Freeze**: Can freeze/unfreeze asset for specific accounts
- **Clawback**: Can revoke assets from any account

### 🌐 External Links:
- [View on AlgoExplorer](https://lora.algokit.io/testnet/asset/${assetInfo.id})
- [Asset Standards (ARC-3)](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md)`;

    return (
      <Detail
        navigationTitle={`Asset ${assetInfo.id}`}
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Asset ID" content={assetInfo.id.toString()} icon={Icon.CopyClipboard} />
            <Action.CopyToClipboard
              title="Copy Asset Name"
              content={assetInfo.params.name || "Unnamed Asset"}
              icon={Icon.Document}
            />
            <Action.OpenInBrowser
              title="View on Algoexplorer"
              url={`https://lora.algokit.io/testnet/asset/${assetInfo.id}`}
              icon={Icon.Globe}
            />
            {assetInfo.params.url && (
              <Action.OpenInBrowser title="Open Asset URL" url={assetInfo.params.url} icon={Icon.Link} />
            )}
            <Action.CopyToClipboard
              title="Copy Creator Address"
              content={assetInfo.params.creator}
              icon={Icon.Person}
            />
            <Action
              title="Search Another Asset"
              onAction={() => {
                setAssetInfo(null);
                setInputAssetId("");
                setError("");
              }}
              icon={Icon.MagnifyingGlass}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Asset Information"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Get Asset Info" onAction={() => fetchAssetInfo()} icon={Icon.MagnifyingGlass} />
          <Action title="Cancel" onAction={pop} icon={Icon.XMarkCircle} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="assetId"
        title="Asset ID"
        placeholder="Enter Asset ID (e.g., 123456)"
        value={inputAssetId}
        onChange={setInputAssetId}
        error={error || (inputAssetId && !validateAssetId(inputAssetId) ? "Must be a positive integer" : undefined)}
      />

      <Form.Description text="Enter the Asset ID of the Algorand Standard Asset (ASA) you want to look up. You can find Asset IDs on AlgoExplorer or in transaction details." />

      <Form.Separator />

      <Form.Description text="💡 Tip: Asset IDs are unique numbers assigned to each ASA when created on the Algorand blockchain." />
    </Form>
  );
}
