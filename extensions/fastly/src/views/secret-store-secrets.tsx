import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Keyboard,
  confirmAlert,
  Alert,
  Clipboard,
  Color,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { SecretStore, SecretStoreSecret } from "../types";
import { getSecretStoreSecrets, deleteSecret } from "../api";
import { SecretForm } from "./secret-form";

interface SecretStoreSecretsProps {
  store: SecretStore;
}

export function SecretStoreSecrets({ store }: SecretStoreSecretsProps) {
  const [secrets, setSecrets] = useState<SecretStoreSecret[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSecrets = useCallback(async () => {
    try {
      setIsLoading(true);
      const allSecrets: SecretStoreSecret[] = [];
      let cursor: string | undefined;

      do {
        const response = await getSecretStoreSecrets(store.id, cursor);
        allSecrets.push(...response.data);
        cursor = response.meta.cursor;
      } while (cursor);

      setSecrets(allSecrets);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load secrets",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  async function handleDeleteSecret(secret: SecretStoreSecret) {
    if (
      await confirmAlert({
        title: "Delete Secret",
        message: `Are you sure you want to delete "${secret.name}" from "${store.name}"? This is irreversible.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteSecret(store.id, secret.name);
        await showToast({ style: Toast.Style.Success, title: "Secret deleted", message: secret.name });
        await loadSecrets();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete secret",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleExportNames() {
    const names = secrets.map((s) => s.name).join("\n");
    await Clipboard.copy(names);
    await showToast({
      style: Toast.Style.Success,
      title: "Secret names copied",
      message: `${secrets.length} name${secrets.length === 1 ? "" : "s"} copied to clipboard (values not included)`,
    });
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={store.name}
      searchBarPlaceholder={`Search secrets in ${store.name}...`}
    >
      {secrets.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Secrets Found"
          description={`"${store.name}" has no secrets yet. Press ${String.fromCharCode(8984)}N to create one.`}
          icon={Icon.Lock}
        />
      ) : (
        secrets.map((secret) => {
          const wasRotated = secret.recreated_at && secret.recreated_at !== secret.created_at;
          return (
            <List.Item
              key={secret.name}
              title={secret.name}
              subtitle="Value hidden"
              icon={{ source: Icon.Lock, tintColor: Color.Orange }}
              accessories={[
                ...(wasRotated
                  ? [
                      {
                        tag: { value: "Rotated", color: Color.Blue },
                        tooltip: `Rotated: ${new Date(secret.recreated_at!).toLocaleString()}`,
                      },
                    ]
                  : []),
                {
                  text: new Date(secret.created_at).toLocaleDateString(),
                  tooltip: "Created",
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Rotate Secret"
                      target={<SecretForm store={store} secretName={secret.name} onSaved={loadSecrets} />}
                      icon={Icon.ArrowCounterClockwise}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "e" },
                        Windows: { modifiers: ["ctrl"], key: "e" },
                      }}
                    />
                    <Action.Push
                      title="Create Secret"
                      target={<SecretForm store={store} onSaved={loadSecrets} />}
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Secret Name"
                      content={secret.name}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "c" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                      }}
                    />
                    <Action
                      title="Export All Names"
                      icon={Icon.Download}
                      onAction={handleExportNames}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "e" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "e" },
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Danger Zone">
                    <Action
                      title="Delete Secret"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteSecret(secret)}
                      shortcut={{
                        macOS: { modifiers: ["ctrl"], key: "x" },
                        Windows: { modifiers: ["ctrl"], key: "x" },
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Quick Access">
                    <Action
                      title="Refresh Secrets"
                      icon={Icon.ArrowClockwise}
                      onAction={loadSecrets}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
