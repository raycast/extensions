import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ItemDetail } from "./items/item-detail";
import type { ItemSummary } from "./items/item";
import type { Vault } from "./vaults/vaults";
import { modules } from "./raycast/create-modules";

export default function Command() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function loadVaults() {
    setIsLoading(true);
    try {
      const status = await modules.session.getStatus();
      if (status.state !== "ready") {
        throw new Error(status.state === "error" ? status.message : "Proton Pass CLI is unavailable.");
      }
      setVaults(await modules.vaults.list());
      setError(undefined);
    } catch (value) {
      const message = value instanceof Error ? value.message : String(value);
      setError(message);
      throw value;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadVaults().catch(() => undefined);
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search vaults"
      actions={
        <ActionPanel>
          <Action.Push title="Create Vault" icon={Icon.Plus} target={<CreateVaultForm onCreated={loadVaults} />} />
        </ActionPanel>
      }
    >
      {error ? <List.EmptyView title="Unable to load vaults" description={error} /> : null}
      <List.Item
        title="Create New Vault"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push title="Create Vault" target={<CreateVaultForm onCreated={loadVaults} />} />
          </ActionPanel>
        }
      />
      {vaults.map((vault) => (
        <List.Item
          key={vault.shareId}
          title={vault.name}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push title="Open Vault" target={<VaultItems vault={vault} />} />
              <Action.Push
                title="Rename Vault"
                icon={Icon.Pencil}
                target={<RenameVaultForm vault={vault} onUpdated={loadVaults} />}
              />
              <Action.Push title="Create Vault" icon={Icon.Plus} target={<CreateVaultForm onCreated={loadVaults} />} />
              <Action
                title="Delete Vault"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: `Delete ${vault.name}?`,
                    message: "This permanently deletes the vault and all its items. This cannot be undone.",
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;
                  try {
                    await modules.vaults.remove(vault);
                    await loadVaults();
                    await showToast({ style: Toast.Style.Success, title: "Vault deleted" });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Unable to delete vault",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RenameVaultForm({ vault, onUpdated }: { vault: Vault; onUpdated: () => Promise<void> }) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function onSubmit({ name }: { name: string }) {
    const newName = name.trim();
    if (!newName) return;
    setIsLoading(true);
    try {
      await modules.vaults.rename(vault, newName);
      await onUpdated();
      await showToast({ style: Toast.Style.Success, title: "Vault renamed" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to rename vault",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Rename Vault"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Vault" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={vault.name} autoFocus />
    </Form>
  );
}

function CreateVaultForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function onSubmit({ name }: { name: string }) {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await modules.vaults.create(name.trim());
      await onCreated();
      await showToast({ style: Toast.Style.Success, title: "Vault created" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to create vault",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Vault"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Vault" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Vault name" autoFocus />
    </Form>
  );
}

function VaultItems({ vault }: { vault: Vault }) {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    await modules.items
      .refresh([vault])
      .then((result) => result.items)
      .then(setItems)
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void load();
  }, [vault.shareId]);

  return (
    <List isLoading={isLoading} navigationTitle={vault.name} searchBarPlaceholder={`Search ${vault.name}`}>
      {items.map((item) => (
        <List.Item
          key={`${item.shareId}:${item.itemId}`}
          title={item.title}
          icon={item.type === "alias" ? Icon.Envelope : Icon.Lock}
          accessories={[{ text: item.type === "alias" ? "Alias" : "Login" }]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<ItemDetail item={item} onDelete={load} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
