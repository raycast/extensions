import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  SavedAddress,
  getSavedAddresses,
  deleteSavedAddress,
  updateAddressLastUsed,
  exportAsJSON,
  exportAsCSV,
  exportSavedAddressesAsMarkdown,
} from "./utils/storage";
import SaveAddressForm from "./components/save-address-form";
import { shortenAddress } from "./utils/blockchain-utils";
import * as chains from "viem/chains";
import { Chain } from "viem/chains";
import { Explorer } from "./interfaces";
import { customChains } from "./custom-chains";

const createExplorersFromChains = (): Explorer[] => {
  const allChains = [...Object.values(chains), ...customChains];
  const uniqueChains = Array.from(new Map(allChains.map((chain) => [chain.id, chain])).values());

  return uniqueChains
    .filter((chain: Chain) => chain.blockExplorers?.default !== undefined)
    .map((chain: Chain) => {
      if (!chain.blockExplorers?.default) {
        throw new Error("Chain should have default explorer");
      }

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

const builtInExplorers = createExplorersFromChains();

export default function Command() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [allExplorers, setAllExplorers] = useState<Explorer[]>(builtInExplorers);
  const { push } = useNavigation();

  useEffect(() => {
    loadAddresses();
    loadExplorers();
  }, []);

  const loadAddresses = async () => {
    setIsLoading(true);
    const loaded = await getSavedAddresses();
    // Sort by last used, most recent first
    loaded.sort((a, b) => b.lastUsed - a.lastUsed);
    setAddresses(loaded);
    setIsLoading(false);
  };

  const loadExplorers = async () => {
    try {
      const userChainsJson = await LocalStorage.getItem<string>("user-custom-chains");
      const userChains: Explorer[] = userChainsJson ? JSON.parse(userChainsJson) : [];
      const combined = [...builtInExplorers, ...userChains];
      setAllExplorers(combined);
    } catch (error) {
      console.error("Error loading explorers:", error);
    }
  };

  const handlePasteAddress = async () => {
    try {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        showToast({ title: "Clipboard Empty", message: "No text found in clipboard" });
        return;
      }

      const trimmed = clipboardText.trim();
      // Basic address validation (0x followed by hex characters)
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmed);

      if (!isValidAddress) {
        showToast({ title: "Invalid Address", message: "Clipboard doesn't contain a valid address" });
        return;
      }

      // Get default explorer (Ethereum)
      const defaultExplorer = allExplorers.find((e) => e.chainId === 1) || allExplorers[0];

      push(
        <SaveAddressForm
          address={trimmed}
          chainId={defaultExplorer.chainId}
          chainName={defaultExplorer.chainName}
          allExplorers={allExplorers}
          onSaved={loadAddresses}
        />,
      );
    } catch (error) {
      console.error("Error pasting address:", error);
      showToast({ title: "Error", message: "Failed to paste address" });
    }
  };

  const handleDelete = async (address: SavedAddress) => {
    const confirmed = await confirmAlert({
      title: "Delete Saved Address",
      message: `Are you sure you want to delete "${address.label}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteSavedAddress(address.id);
      await loadAddresses();
      showToast({ title: "Deleted", message: `Removed "${address.label}"` });
    }
  };

  const handleOpenExplorer = async (address: SavedAddress) => {
    await updateAddressLastUsed(address.address);
    await loadAddresses();
  };

  const handleExport = async (format: "json" | "csv" | "markdown") => {
    let content = "";
    let message = "";

    switch (format) {
      case "json":
        content = exportAsJSON(addresses);
        message = "Exported as JSON";
        break;
      case "csv":
        content = exportAsCSV(addresses);
        message = "Exported as CSV";
        break;
      case "markdown":
        content = exportSavedAddressesAsMarkdown(addresses);
        message = "Exported as Markdown";
        break;
    }

    await Clipboard.copy(content);
    showToast({ title: "Copied to Clipboard", message });
  };

  const filteredAddresses = addresses.filter((addr) => {
    const search = searchText.toLowerCase();
    return (
      addr.label.toLowerCase().includes(search) ||
      addr.address.toLowerCase().includes(search) ||
      addr.tags.some((tag) => tag.toLowerCase().includes(search)) ||
      (addr.notes && addr.notes.toLowerCase().includes(search))
    );
  });

  // Group by tags
  const tagGroups = new Map<string, SavedAddress[]>();
  tagGroups.set("All", filteredAddresses);

  filteredAddresses.forEach((addr) => {
    if (addr.tags.length === 0) {
      if (!tagGroups.has("Untagged")) {
        tagGroups.set("Untagged", []);
      }
      tagGroups.get("Untagged")!.push(addr);
    } else {
      addr.tags.forEach((tag) => {
        if (!tagGroups.has(tag)) {
          tagGroups.set(tag, []);
        }
        tagGroups.get(tag)!.push(addr);
      });
    }
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search saved addresses by label, address, or tag..."
      navigationTitle="Saved Addresses"
    >
      {filteredAddresses.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Saved Addresses"
          description="Save addresses from search results with ⌘ + S or paste with ⌘ + ↵"
          icon={Icon.Star}
          actions={
            <ActionPanel>
              <Action
                title="Paste Address from Clipboard"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={handlePasteAddress}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`${filteredAddresses.length} Address${filteredAddresses.length === 1 ? "" : "es"}`}>
          {filteredAddresses.map((address) => (
            <List.Item
              key={address.id}
              title={address.label}
              subtitle={shortenAddress(address.address)}
              icon={Icon.Star}
              accessories={[
                ...address.tags.map((tag) => ({ tag: { value: tag, color: "#4A90E2" } })),
                { text: `${address.chains.length} chain${address.chains.length === 1 ? "" : "s"}` },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`# ${address.label}\n\n\`\`\`\n${address.address}\n\`\`\`\n\n${address.notes ? `**Notes:** ${address.notes}` : ""}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Address" text={address.address} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {address.tags.length > 0 ? (
                          address.tags.map((tag) => <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />)
                        ) : (
                          <List.Item.Detail.Metadata.TagList.Item text="None" color="#999" />
                        )}
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Associated Chains"
                        text={address.chains.join(", ") || "None"}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Created"
                        text={new Date(address.createdAt).toLocaleDateString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Last Used"
                        text={new Date(address.lastUsed).toLocaleDateString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Actions">
                    {address.chains.map((chainId) => (
                      <Action.OpenInBrowser
                        key={chainId}
                        title={`Open on Chain ${chainId}`}
                        url={`https://etherscan.io/address/${address.address}`}
                        icon={Icon.Globe}
                        onOpen={() => handleOpenExplorer(address)}
                      />
                    ))}
                    <Action
                      title="Edit Address"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() =>
                        push(
                          <SaveAddressForm
                            address={address.address}
                            chainId={address.chains[0]}
                            chainName={`Chain ${address.chains[0]}`}
                            allExplorers={allExplorers}
                            existingEntry={address}
                            onSaved={loadAddresses}
                          />,
                        )
                      }
                    />
                    <Action
                      title="Paste Address from Clipboard"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={handlePasteAddress}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      content={address.address}
                      title="Copy Address"
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard content={address.label} title="Copy Label" />
                    {address.notes && <Action.CopyToClipboard content={address.notes} title="Copy Notes" />}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Export">
                    <Action
                      title="Export All as JSON"
                      icon={Icon.Document}
                      onAction={() => handleExport("json")}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                    />
                    <Action
                      title="Export All as Csv"
                      icon={Icon.Document}
                      onAction={() => handleExport("csv")}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action
                      title="Export All as Markdown"
                      icon={Icon.Document}
                      onAction={() => handleExport("markdown")}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Manage">
                    <Action
                      title="Delete Address"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(address)}
                    />
                    <Action
                      title="Refresh List"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadAddresses}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
