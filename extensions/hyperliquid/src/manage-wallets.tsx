import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { addOrUpdateWallet, normalizeWalletAddress, removeWallet, validateWalletAddress } from "./lib/storage";
import { getStoredWallets, setStoredWallets } from "./lib/raycast-storage";
import type { Wallet } from "./lib/types";

interface WalletFormValues {
  label: string;
  address: string;
}

async function loadWallets(): Promise<Wallet[]> {
  return getStoredWallets();
}

export default function Command() {
  const walletsState = useCachedPromise(loadWallets, [], { initialData: [] });
  const wallets = walletsState.data ?? [];

  async function deleteWallet(wallet: Wallet) {
    const confirmed = await confirmAlert({
      title: `Delete ${wallet.label}?`,
      message: "This only removes the local label and address from Raycast.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    await setStoredWallets(removeWallet(wallets, wallet.id));
    walletsState.revalidate();
  }

  return (
    <List
      isLoading={walletsState.isLoading}
      searchBarPlaceholder="Search tracked wallets"
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Wallet"
            icon={Icon.Plus}
            target={<WalletForm wallets={wallets} onSaved={walletsState.revalidate} />}
          />
        </ActionPanel>
      }
    >
      {wallets.length === 0 && !walletsState.isLoading ? (
        <List.EmptyView
          title="No Wallets"
          description="Add a public wallet address to view read-only perps positions."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Wallet"
                icon={Icon.Plus}
                target={<WalletForm wallets={wallets} onSaved={walletsState.revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        wallets.map((wallet) => (
          <List.Item
            key={wallet.id}
            title={wallet.label}
            subtitle={wallet.address}
            icon={{ source: Icon.Wallet, tintColor: Color.PrimaryText }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Wallet"
                  icon={Icon.Pencil}
                  target={<WalletForm wallet={wallet} wallets={wallets} onSaved={walletsState.revalidate} />}
                />
                <Action.Push
                  title="Add Wallet"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<WalletForm wallets={wallets} onSaved={walletsState.revalidate} />}
                />
                <Action.CopyToClipboard title="Copy Address" content={wallet.address} />
                <Action
                  title="Delete Wallet"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteWallet(wallet)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function WalletForm({ wallet, wallets, onSaved }: { wallet?: Wallet; wallets: Wallet[]; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [address, setAddress] = useState(wallet?.address ?? "");

  async function submit(values: WalletFormValues) {
    const normalizedAddress = normalizeWalletAddress(values.address);
    if (!values.label.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Label is required" });
      return false;
    }
    if (!validateWalletAddress(normalizedAddress)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid wallet address",
        message: "Use 0x followed by 40 hex characters.",
      });
      return false;
    }

    const next = addOrUpdateWallet(wallets, {
      id: wallet?.id,
      label: values.label,
      address: normalizedAddress,
    });
    await setStoredWallets(next);
    await showToast({ style: Toast.Style.Success, title: wallet ? "Wallet updated" : "Wallet added" });
    onSaved();
    pop();
    return true;
  }

  return (
    <Form
      navigationTitle={wallet ? "Edit Wallet" : "Add Wallet"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={wallet ? "Save Wallet" : "Add Wallet"} icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="label" title="Label" placeholder="Main" defaultValue={wallet?.label} />
      <Form.TextField
        id="address"
        title="Address"
        placeholder="0x..."
        value={address}
        onChange={setAddress}
        error={
          address.length > 0 && !validateWalletAddress(address) ? "Use 0x followed by 40 hex characters" : undefined
        }
      />
    </Form>
  );
}
