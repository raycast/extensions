import { Action, ActionPanel, Form, Icon, showToast, useNavigation, LocalStorage } from "@raycast/api";
import { useState } from "react";
import { Explorer } from "./interfaces";

interface AddCustomChainProps {
  onChainAdded: (chain: Explorer) => void;
  existingChain?: Explorer; // For editing
}

export default function AddCustomChain({ onChainAdded, existingChain }: AddCustomChainProps) {
  const { pop } = useNavigation();
  const isEditing = !!existingChain;

  // Basic Info
  const [chainName, setChainName] = useState(existingChain?.chainName || "");
  const [explorerName, setExplorerName] = useState(existingChain?.explorerName || "");
  const [explorerUrl, setExplorerUrl] = useState(existingChain?.baseUrl || "");
  const [chainId, setChainId] = useState(existingChain?.chainId.toString() || "");
  const [currency, setCurrency] = useState(existingChain?.currency || "");
  const [isTestnet, setIsTestnet] = useState(existingChain?.testNet || false);

  // URL Paths
  const [txPath, setTxPath] = useState(existingChain?.config?.paths?.transaction || "/tx/");
  const [addressPath, setAddressPath] = useState(existingChain?.config?.paths?.address || "/address/");
  const [blockPath, setBlockPath] = useState(existingChain?.config?.paths?.block || "/block/");
  const [tokenPath, setTokenPath] = useState(existingChain?.config?.paths?.token || "/token/");

  // Patterns (optional)
  const [addressPattern, setAddressPattern] = useState(existingChain?.config?.patterns?.address?.regex || "");
  const [txPattern, setTxPattern] = useState(existingChain?.config?.patterns?.transaction?.regex || "");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!chainName.trim()) {
      newErrors.chainName = "Chain name is required";
    }

    if (!explorerName.trim()) {
      newErrors.explorerName = "Explorer name is required";
    }

    if (!explorerUrl.trim()) {
      newErrors.explorerUrl = "Explorer URL is required";
    } else if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(explorerUrl)) {
      newErrors.explorerUrl = "Invalid URL format (e.g., etherscan.io)";
    }

    if (!chainId.trim()) {
      newErrors.chainId = "Chain ID is required";
    } else if (!/^\d+$/.test(chainId)) {
      newErrors.chainId = "Chain ID must be a number";
    }

    if (!currency.trim()) {
      newErrors.currency = "Currency symbol is required";
    }

    // Validate regex patterns if provided
    if (addressPattern) {
      try {
        new RegExp(addressPattern);
      } catch {
        newErrors.addressPattern = "Invalid regex pattern";
      }
    }

    if (txPattern) {
      try {
        new RegExp(txPattern);
      } catch {
        newErrors.txPattern = "Invalid regex pattern";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showToast({
        title: "Validation Error",
        message: "Please fix the errors before submitting",
      });
      return;
    }

    const customChain: Explorer = {
      chainName: chainName.trim(),
      explorerName: explorerName.trim(),
      baseUrl: explorerUrl
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, ""),
      chainId: parseInt(chainId),
      currency: currency.trim().toUpperCase(),
      iconUri: `../assets/${chainName.toLowerCase().replace(/\s+/g, "-")}.svg`,
      testNet: isTestnet,
      config: {
        paths: {
          transaction: txPath,
          address: addressPath,
          block: blockPath,
          token: tokenPath,
        },
        patterns: {},
      },
    };

    // Add patterns if provided
    if (addressPattern) {
      customChain.config!.patterns!.address = { regex: addressPattern };
    }
    if (txPattern) {
      customChain.config!.patterns!.transaction = { regex: txPattern };
    }

    try {
      // Load existing custom chains
      const customChainsJson = await LocalStorage.getItem<string>("user-custom-chains");
      const customChains: Explorer[] = customChainsJson ? JSON.parse(customChainsJson) : [];

      if (isEditing) {
        // Update existing chain
        const index = customChains.findIndex((c) => c.chainId === existingChain.chainId);
        if (index !== -1) {
          customChains[index] = customChain;
        }
      } else {
        // Check for duplicate chain ID
        if (customChains.some((c) => c.chainId === customChain.chainId)) {
          showToast({
            title: "Error",
            message: `Chain ID ${customChain.chainId} already exists`,
          });
          return;
        }
        customChains.push(customChain);
      }

      // Save to LocalStorage
      await LocalStorage.setItem("user-custom-chains", JSON.stringify(customChains));

      showToast({
        title: isEditing ? "Chain Updated" : "Chain Added",
        message: `${customChain.chainName} has been ${isEditing ? "updated" : "added"} successfully`,
      });

      onChainAdded(customChain);
      pop();
    } catch (error) {
      console.error("Error saving custom chain:", error);
      showToast({
        title: "Error",
        message: "Failed to save custom chain",
      });
    }
  };

  return (
    <Form
      navigationTitle={isEditing ? "Edit Custom Chain" : "Add Custom Chain"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Chain" : "Add Chain"}
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
          <Action title="Cancel" onAction={pop} icon={Icon.XMarkCircle} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={isEditing ? "Edit Chain" : "Add New Blockchain"}
        text="Fill in the details for your custom blockchain explorer"
      />

      <Form.Separator />

      <Form.TextField
        id="chainName"
        title="Chain Name"
        placeholder="e.g., Polygon, Avalanche, My Custom Chain"
        value={chainName}
        onChange={setChainName}
        error={errors.chainName}
        info="Display name for the blockchain"
      />

      <Form.TextField
        id="explorerName"
        title="Explorer Name"
        placeholder="e.g., PolygonScan, SnowTrace"
        value={explorerName}
        onChange={setExplorerName}
        error={errors.explorerName}
        info="Name of the block explorer"
      />

      <Form.TextField
        id="explorerUrl"
        title="Explorer URL"
        placeholder="e.g., polygonscan.com, snowtrace.io"
        value={explorerUrl}
        onChange={setExplorerUrl}
        error={errors.explorerUrl}
        info="Domain only, without https:// or trailing slash"
      />

      <Form.TextField
        id="chainId"
        title="Chain ID"
        placeholder="e.g., 137, 43114"
        value={chainId}
        onChange={setChainId}
        error={errors.chainId}
        info="Unique numeric identifier for the blockchain (check ChainList.org)"
      />

      <Form.TextField
        id="currency"
        title="Native Currency Symbol"
        placeholder="e.g., MATIC, AVAX, ETH"
        value={currency}
        onChange={setCurrency}
        error={errors.currency}
        info="Symbol of the native currency"
      />

      <Form.Checkbox
        id="isTestnet"
        label="This is a testnet"
        value={isTestnet}
        onChange={setIsTestnet}
        info="Check if this is a test network"
      />

      <Form.Separator />

      <Form.Description title="Explorer URL Paths" text="Configure how URLs are structured on this explorer" />

      <Form.TextField
        id="txPath"
        title="Transaction Path"
        placeholder="/tx/"
        value={txPath}
        onChange={setTxPath}
        info="URL path for transactions (e.g., /tx/, /transaction/)"
      />

      <Form.TextField
        id="addressPath"
        title="Address Path"
        placeholder="/address/"
        value={addressPath}
        onChange={setAddressPath}
        info="URL path for addresses (e.g., /address/, /account/)"
      />

      <Form.TextField
        id="blockPath"
        title="Block Path"
        placeholder="/block/"
        value={blockPath}
        onChange={setBlockPath}
        info="URL path for blocks"
      />

      <Form.TextField
        id="tokenPath"
        title="Token Path"
        placeholder="/token/"
        value={tokenPath}
        onChange={setTokenPath}
        info="URL path for tokens"
      />

      <Form.Separator />

      <Form.Description
        title="Pattern Matching (Optional)"
        text="Define custom patterns if your chain uses non-standard address/transaction formats"
      />

      <Form.TextField
        id="addressPattern"
        title="Address Pattern (Regex)"
        placeholder="e.g., ^0x[a-fA-F0-9]{40}$ for Ethereum"
        value={addressPattern}
        onChange={setAddressPattern}
        error={errors.addressPattern}
        info="Leave blank for standard EVM addresses"
      />

      <Form.TextField
        id="txPattern"
        title="Transaction Pattern (Regex)"
        placeholder="e.g., ^0x[a-fA-F0-9]{64}$ for Ethereum"
        value={txPattern}
        onChange={setTxPattern}
        error={errors.txPattern}
        info="Leave blank for standard EVM transactions"
      />

      <Form.Description text="💡 Tip: Most EVM-compatible chains can leave patterns blank. For examples of non-EVM patterns, check the documentation." />
    </Form>
  );
}
