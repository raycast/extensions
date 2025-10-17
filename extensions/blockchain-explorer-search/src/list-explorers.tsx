import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  showToast,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import * as chains from "viem/chains";
import { Chain } from "viem/chains";
import { Explorer, ExplorerConfig } from "./interfaces";
import { customChains } from "./custom-chains";
import ConfigureExplorer from "./configure-explorer";
import { hasCustomConfig } from "./explorer-configs";
import AddCustomChain from "./add-custom-chain";

// Store chain data for later access
const chainDataMap = new Map<number, Chain>();

const createExplorersFromChains = (): Explorer[] => {
  // Combine viem chains with our custom chains
  const allChains = [...Object.values(chains), ...customChains];

  // Deduplicate by chainId, keeping the first occurrence
  const uniqueChains = Array.from(new Map(allChains.map((chain) => [chain.id, chain])).values());

  return uniqueChains
    .filter((chain: Chain) => chain.blockExplorers?.default !== undefined)
    .map((chain: Chain) => {
      if (!chain.blockExplorers?.default) {
        throw new Error("Chain should have default explorer");
      }
      // Store chain data for RPC URL access
      chainDataMap.set(chain.id, chain);

      const nameWithoutNet = chain.name.replace(/testnet|mainnet/gi, "");
      const explorer: Explorer = {
        chainName: nameWithoutNet,
        explorerName: chain.blockExplorers.default.name || "Block Explorer",
        baseUrl: chain.blockExplorers.default.url.replace(/^https?:\/\//, ""),
        chainId: chain.id,
        currency: chain.nativeCurrency.symbol,
        iconUri: `../assets/${nameWithoutNet.toLowerCase()}.svg`,
        testNet: chain.testnet || false,
        imageUrl: chain.blockExplorers.default.url + "/images/logo.svg",
      };
      return explorer;
    });
};

const explorers = createExplorersFromChains();
const defaultExplorer = explorers.find((explorer: Explorer) => explorer.chainId === 1) || explorers[0];

export default function Command() {
  const [selectedExplorer, setSelectedExplorer] = useState<Explorer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [explorersList, setExplorersList] = useState<Explorer[]>(explorers);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load custom configs
        const customConfigsJson = await LocalStorage.getItem<string>("custom-explorer-configs");
        const customConfigs: Record<number, ExplorerConfig> = customConfigsJson ? JSON.parse(customConfigsJson) : {};

        // Load user-added custom chains
        const userChainsJson = await LocalStorage.getItem<string>("user-custom-chains");
        const userChains: Explorer[] = userChainsJson ? JSON.parse(userChainsJson) : [];

        // Combine built-in and user chains
        const allExplorers = [...explorers, ...userChains];

        // Apply custom configs to explorers
        const updatedExplorers = allExplorers.map((explorer) => {
          if (customConfigs[explorer.chainId]) {
            return { ...explorer, config: customConfigs[explorer.chainId] };
          }
          return explorer;
        });

        setExplorersList(updatedExplorers);

        // Load selected explorer
        const selectedExplorerFromStorage = await LocalStorage.getItem<string>("selected-explorer");
        if (selectedExplorerFromStorage) {
          try {
            const parsedExplorer: Explorer = JSON.parse(selectedExplorerFromStorage);
            // Apply custom config if available
            const explorerWithConfig = updatedExplorers.find((e) => e.chainId === parsedExplorer.chainId);
            setSelectedExplorer(explorerWithConfig || parsedExplorer);
          } catch (error) {
            setSelectedExplorer(defaultExplorer);
            console.log(error);
          }
        } else {
          setSelectedExplorer(defaultExplorer);
        }
      } catch (error) {
        console.error("Error loading from storage:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const { pop, push } = useNavigation();

  const handleExplorerChange = async (explorer: Explorer) => {
    try {
      await LocalStorage.setItem("selected-explorer", JSON.stringify(explorer));
      setSelectedExplorer(explorer);
      pop();
      showToast({ title: "Explorer changed", message: `${explorer.chainName}` });
    } catch (error) {
      console.error("Error saving explorer:", error);
      showToast({ title: "Error", message: "Failed to save explorer selection" });
    }
  };

  const handleConfigUpdate = async (updatedExplorer: Explorer) => {
    // Update the explorers list
    const updatedList = explorersList.map((e) => (e.chainId === updatedExplorer.chainId ? updatedExplorer : e));
    setExplorersList(updatedList);

    // Update selected explorer if it's the one being configured
    if (selectedExplorer?.chainId === updatedExplorer.chainId) {
      setSelectedExplorer(updatedExplorer);
      await LocalStorage.setItem("selected-explorer", JSON.stringify(updatedExplorer));
    }
  };

  const handleChainAdded = async (newChain: Explorer) => {
    // Reload all data to include the new chain
    const userChainsJson = await LocalStorage.getItem<string>("user-custom-chains");
    const userChains: Explorer[] = userChainsJson ? JSON.parse(userChainsJson) : [];

    const allExplorers = [...explorers, ...userChains];
    setExplorersList(allExplorers);

    showToast({
      title: "Success",
      message: `${newChain.chainName} has been added`,
    });
  };

  const handleDeleteChain = async (chain: Explorer) => {
    const confirmed = await confirmAlert({
      title: "Delete Custom Chain",
      message: `Are you sure you want to delete ${chain.chainName}? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      // Load user chains
      const userChainsJson = await LocalStorage.getItem<string>("user-custom-chains");
      const userChains: Explorer[] = userChainsJson ? JSON.parse(userChainsJson) : [];

      // Remove the chain
      const updatedChains = userChains.filter((c) => c.chainId !== chain.chainId);
      await LocalStorage.setItem("user-custom-chains", JSON.stringify(updatedChains));

      // Update the list
      const updatedList = explorersList.filter((e) => e.chainId !== chain.chainId);
      setExplorersList(updatedList);

      // If deleted chain was selected, switch to default
      if (selectedExplorer?.chainId === chain.chainId) {
        const defaultExplorer = updatedList.find((e) => e.chainId === 1) || updatedList[0];
        setSelectedExplorer(defaultExplorer);
        await LocalStorage.setItem("selected-explorer", JSON.stringify(defaultExplorer));
      }

      showToast({
        title: "Chain Deleted",
        message: `${chain.chainName} has been removed`,
      });
    } catch (error) {
      console.error("Error deleting chain:", error);
      showToast({
        title: "Error",
        message: "Failed to delete chain",
      });
    }
  };

  const isUserAddedChain = (chainId: number): boolean => {
    // Check if this chain was added by the user (not in built-in explorers)
    return !explorers.some((e) => e.chainId === chainId);
  };

  if (isLoading) {
    return <List isLoading />;
  }

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search for an Explorer"
      actions={
        <ActionPanel>
          <Action
            title="Add Custom Chain"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<AddCustomChain onChainAdded={handleChainAdded} />)}
          />
        </ActionPanel>
      }
    >
      {explorersList.map((explorer: Explorer) => {
        const accessories = [];
        const keywords = [
          explorer.currency,
          explorer.explorerName,
          explorer.chainId.toString(),
          explorer.testNet ? "testnet" : "mainnet",
        ];

        if (selectedExplorer?.chainId === explorer.chainId) {
          accessories.push({
            text: "Selected",
            icon: "✅",
            tooltip: "The explorer used in searches.",
          });
        }

        // Show if explorer has custom configuration
        const isCustomConfigured = explorer.config !== undefined || hasCustomConfig(explorer.baseUrl);
        if (isCustomConfigured) {
          accessories.push({
            icon: Icon.Gear,
            tooltip: "Custom configuration active",
          });
        }

        return (
          <List.Item
            id={`explorer-${explorer.chainId}`}
            key={`${explorer.chainName}-${explorer.chainId}`}
            title={explorer.chainName}
            subtitle={explorer.testNet ? "Testnet" : "Mainnet"}
            icon={{ source: explorer.iconUri }}
            keywords={keywords}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={`# ${explorer.chainName}\n[${explorer.baseUrl}](https://${explorer.baseUrl})\n${explorer.imageUrl ? `![](${explorer.imageUrl})` : ""}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Explorer Name" text={explorer.explorerName} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Currency" text={explorer.currency} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Chain ID" text={explorer.chainId.toString()} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Network Type"
                      text={explorer.testNet ? "Testnet" : "Mainnet"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {(() => {
                      const chainData = chainDataMap.get(explorer.chainId);
                      const rpcUrl = chainData?.rpcUrls?.default?.http?.[0] || chainData?.rpcUrls?.public?.http?.[0];
                      return rpcUrl ? (
                        <>
                          <List.Item.Detail.Metadata.Link title="RPC URL" text={rpcUrl} target={rpcUrl} />
                          <List.Item.Detail.Metadata.Separator />
                        </>
                      ) : null;
                    })()}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Explorer Actions">
                  <Action.OpenInBrowser url={`https://${explorer.baseUrl}`} />
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Change Explorer"
                    onAction={() => handleExplorerChange(explorer)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Configuration">
                  <Action
                    icon={Icon.Gear}
                    title="Configure Explorer"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => push(<ConfigureExplorer explorer={explorer} onConfigUpdate={handleConfigUpdate} />)}
                  />
                  {isUserAddedChain(explorer.chainId) && (
                    <>
                      <Action
                        icon={Icon.Pencil}
                        title="Edit Custom Chain"
                        shortcut={{ modifiers: ["cmd"], key: "u" }}
                        onAction={() =>
                          push(<AddCustomChain onChainAdded={handleChainAdded} existingChain={explorer} />)
                        }
                      />
                      <Action
                        icon={Icon.Trash}
                        title="Delete Custom Chain"
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                        onAction={() => handleDeleteChain(explorer)}
                      />
                    </>
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section title="Manage Chains">
                  <Action
                    title="Add Custom Chain"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<AddCustomChain onChainAdded={handleChainAdded} />)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Explorer URL"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    content={`https://${explorer.baseUrl}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Chain ID"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    content={explorer.chainId.toString()}
                    onCopy={() => showToast({ title: "Copied", message: `Chain ID: ${explorer.chainId}` })}
                  />
                  {(() => {
                    const chainData = chainDataMap.get(explorer.chainId);
                    const rpcUrl = chainData?.rpcUrls?.default?.http?.[0] || chainData?.rpcUrls?.public?.http?.[0];
                    return rpcUrl ? (
                      <Action.CopyToClipboard
                        title="Copy Rpc URL"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        content={rpcUrl}
                        onCopy={() => showToast({ title: "Copied", message: "RPC URL copied to clipboard" })}
                      />
                    ) : null;
                  })()}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
