import React, { useEffect, useState } from "react";
import { Action, ActionPanel, List, Clipboard, showToast, Toast } from "@raycast/api";
import { WalletInfo, searchWallets } from "./utils/storage";

export default function SearchWallet() {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWallets("");
  }, []);

  async function loadWallets(query: string) {
    setIsLoading(true);
    try {
      const results = await searchWallets(query);
      setWallets(results);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load wallets",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={loadWallets} searchBarPlaceholder="Search wallets...">
      {wallets.map((wallet) => (
        <List.Item
          key={wallet.address}
          title={wallet.name}
          subtitle={wallet.address}
          actions={
            <ActionPanel>
              <Action
                title="Copy Address"
                onAction={() => {
                  Clipboard.copy(wallet.address);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Address copied to clipboard",
                  });
                }}
              />
              <Action.OpenInBrowser title="Open in Solana.fm" url={`https://solana.fm/address/${wallet.address}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
