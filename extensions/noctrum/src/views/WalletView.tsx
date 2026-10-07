import { List, Action, ActionPanel, Icon, showToast, Toast, Clipboard, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { getStoredWallet, createWallet, storeWallet, deleteWallet, WalletData } from "../lib/wallet";

export function WalletView({ onDone }: { onDone?: () => void }) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const w = await getStoredWallet();
    setWallet(w);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    const w = await createWallet();
    setWallet(w);
    showToast(Toast.Style.Success, "Wallet created", w.address);
    onDone?.();
  }

  async function handleImport() {
    const text = (await Clipboard.readText())?.trim();
    if (!text || !text.startsWith("0x") || text.length !== 66) {
      showToast(Toast.Style.Failure, "Paste a valid private key to clipboard first");
      return;
    }
    try {
      const w = await storeWallet(text);
      setWallet(w);
      showToast(Toast.Style.Success, "Wallet imported", w.address);
      onDone?.();
    } catch {
      showToast(Toast.Style.Failure, "Invalid private key");
    }
  }

  async function handleDelete() {
    if (await confirmAlert({ title: "Delete wallet?", message: "This removes the stored key from Raycast." })) {
      await deleteWallet();
      setWallet(null);
      showToast(Toast.Style.Success, "Wallet deleted");
      onDone?.();
    }
  }

  if (isLoading) return <List isLoading />;

  if (!wallet) {
    return (
      <List>
        <List.Section title="No Wallet Found">
          <List.Item
            title="Create New Wallet"
            subtitle="Generate a random Monad Testnet wallet"
            icon={Icon.PlusCircle}
            actions={
              <ActionPanel>
                <Action title="Create Wallet" onAction={handleCreate} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Import from Clipboard"
            subtitle="Paste a 0x-prefixed private key"
            icon={Icon.Clipboard}
            actions={
              <ActionPanel>
                <Action title="Import Wallet" onAction={handleImport} />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  return (
    <List>
      <List.Section title="Active Wallet">
        <List.Item
          title="Address"
          subtitle={wallet.address}
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Address" content={wallet.address} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Copy Private Key"
          subtitle="Copy to clipboard"
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Private Key" content={wallet.privateKey} concealed />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Import Different Wallet"
          subtitle="Replace with key from clipboard"
          icon={Icon.Clipboard}
          actions={
            <ActionPanel>
              <Action title="Import Wallet" onAction={handleImport} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Delete Wallet"
          subtitle="Remove stored wallet"
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action title="Delete Wallet" onAction={handleDelete} style={Action.Style.Destructive} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
