import { Action, ActionPanel, Form, Icon, showToast, useNavigation, LocalStorage } from "@raycast/api";
import { useState } from "react";
import { Explorer, ExplorerConfig, PathConfig, PatternConfig } from "./interfaces";

interface ConfigureExplorerProps {
  explorer: Explorer;
  onConfigUpdate: (explorer: Explorer) => void;
}

export default function ConfigureExplorer({ explorer, onConfigUpdate }: ConfigureExplorerProps) {
  const { pop } = useNavigation();
  const [config] = useState<ExplorerConfig>(explorer.config || {});

  // Path configuration
  const [txPath, setTxPath] = useState(config.paths?.transaction || "/tx/");
  const [addressPath, setAddressPath] = useState(config.paths?.address || "/address/");
  const [blockPath, setBlockPath] = useState(config.paths?.block || "/block/");
  const [tokenPath, setTokenPath] = useState(config.paths?.token || "/token/");
  const [ensPath, setEnsPath] = useState(config.paths?.ens || "/enslookup-search?search=");
  const [signaturePath, setSignaturePath] = useState(config.paths?.signature || "/tx/");

  // Pattern configuration
  const [txPattern, setTxPattern] = useState(config.patterns?.transaction?.regex || "");
  const [addressPattern, setAddressPattern] = useState(config.patterns?.address?.regex || "");
  const [blockPattern, setBlockPattern] = useState(config.patterns?.block?.regex || "");
  const [signaturePattern, setSignaturePattern] = useState(config.patterns?.signature?.regex || "");
  const [ensPattern, setEnsPattern] = useState(config.patterns?.ens?.regex || "");

  const handleSubmit = async () => {
    const paths: PathConfig = {
      transaction: txPath,
      address: addressPath,
      block: blockPath,
      token: tokenPath,
      ens: ensPath,
      signature: signaturePath,
    };

    const patterns: PatternConfig = {};

    if (txPattern) {
      patterns.transaction = { regex: txPattern };
    }
    if (addressPattern) {
      patterns.address = { regex: addressPattern };
    }
    if (blockPattern) {
      patterns.block = { regex: blockPattern };
    }
    if (signaturePattern) {
      patterns.signature = { regex: signaturePattern };
    }
    if (ensPattern) {
      patterns.ens = { regex: ensPattern };
    }

    const newConfig: ExplorerConfig = {
      paths,
      patterns: Object.keys(patterns).length > 0 ? patterns : undefined,
    };

    const updatedExplorer = { ...explorer, config: newConfig };

    try {
      // Save to custom configs storage
      const customConfigsJson = await LocalStorage.getItem<string>("custom-explorer-configs");
      const customConfigs: Record<number, ExplorerConfig> = customConfigsJson ? JSON.parse(customConfigsJson) : {};

      customConfigs[explorer.chainId] = newConfig;
      await LocalStorage.setItem("custom-explorer-configs", JSON.stringify(customConfigs));

      onConfigUpdate(updatedExplorer);
      showToast({
        title: "Configuration Saved",
        message: `Custom configuration for ${explorer.chainName} has been saved`,
      });
      pop();
    } catch (error) {
      console.error("Error saving configuration:", error);
      showToast({
        title: "Error",
        message: "Failed to save explorer configuration",
      });
    }
  };

  const handleReset = async () => {
    try {
      // Remove from custom configs
      const customConfigsJson = await LocalStorage.getItem<string>("custom-explorer-configs");
      const customConfigs: Record<number, ExplorerConfig> = customConfigsJson ? JSON.parse(customConfigsJson) : {};

      delete customConfigs[explorer.chainId];
      await LocalStorage.setItem("custom-explorer-configs", JSON.stringify(customConfigs));

      const resetExplorer = { ...explorer, config: undefined };
      onConfigUpdate(resetExplorer);

      showToast({
        title: "Configuration Reset",
        message: `Custom configuration for ${explorer.chainName} has been reset to defaults`,
      });
      pop();
    } catch (error) {
      console.error("Error resetting configuration:", error);
      showToast({
        title: "Error",
        message: "Failed to reset explorer configuration",
      });
    }
  };

  return (
    <Form
      navigationTitle={`Configure ${explorer.chainName} Explorer`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" onSubmit={handleSubmit} icon={Icon.Check} />
          <Action title="Reset to Defaults" onAction={handleReset} icon={Icon.Undo} style={Action.Style.Destructive} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Explorer Configuration"
        text={`Customize paths and patterns for ${explorer.explorerName} on ${explorer.chainName}`}
      />

      <Form.Separator />

      <Form.Description title="URL Paths" text="Configure the URL paths for different types of searches" />

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
        info="URL path for blocks (e.g., /block/, /blocks/)"
      />

      <Form.TextField
        id="tokenPath"
        title="Token Path"
        placeholder="/token/"
        value={tokenPath}
        onChange={setTokenPath}
        info="URL path for tokens (e.g., /token/, /coin/)"
      />

      <Form.TextField
        id="signaturePath"
        title="Signature Path"
        placeholder="/tx/"
        value={signaturePath}
        onChange={setSignaturePath}
        info="URL path for signatures (primarily for non-EVM chains like Solana)"
      />

      <Form.TextField
        id="ensPath"
        title="ENS/Name Path"
        placeholder="/enslookup-search?search="
        value={ensPath}
        onChange={setEnsPath}
        info="URL path for ENS or name lookups"
      />

      <Form.Separator />

      <Form.Description
        title="Pattern Matching (Optional)"
        text="Define custom regex patterns to match specific input formats. Leave blank to use defaults."
      />

      <Form.TextField
        id="txPattern"
        title="Transaction Pattern"
        placeholder="^0x[a-fA-F0-9]{64}$"
        value={txPattern}
        onChange={setTxPattern}
        info="Regex pattern to match transaction hashes (e.g., ^0x[a-fA-F0-9]{64}$ for EVM)"
      />

      <Form.TextField
        id="addressPattern"
        title="Address Pattern"
        placeholder="^0x[a-fA-F0-9]{40}$"
        value={addressPattern}
        onChange={setAddressPattern}
        info="Regex pattern to match addresses"
      />

      <Form.TextField
        id="signaturePattern"
        title="Signature Pattern"
        placeholder="^[1-9A-HJ-NP-Za-km-z]{87,88}$"
        value={signaturePattern}
        onChange={setSignaturePattern}
        info="Regex pattern to match signatures (e.g., base58 for Solana)"
      />

      <Form.TextField
        id="blockPattern"
        title="Block Pattern"
        placeholder="^\\d+$"
        value={blockPattern}
        onChange={setBlockPattern}
        info="Regex pattern to match block numbers/hashes"
      />

      <Form.TextField
        id="ensPattern"
        title="ENS/Name Pattern"
        placeholder="^.+\\.eth$"
        value={ensPattern}
        onChange={setEnsPattern}
        info="Regex pattern to match ENS or name service entries"
      />
    </Form>
  );
}
