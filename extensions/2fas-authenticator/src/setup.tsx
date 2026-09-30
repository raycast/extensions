import { useState, useEffect, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  LaunchType,
  launchCommand,
} from "@raycast/api";
import {
  isVaultConfigured,
  deleteVault,
  loadVault,
  lockVault,
} from "./lib/vault";
import { withVaultUnlock } from "./lib/vault-ui";

export default function Setup() {
  const [vaultExists, setVaultExists] = useState(false);
  const [serviceCount, setServiceCount] = useState<number>();
  const [isLoading, setIsLoading] = useState(true);

  const check = useCallback(async () => {
    setIsLoading(true);
    const configured = isVaultConfigured();
    setVaultExists(configured);
    if (!configured) {
      setServiceCount(undefined);
      setIsLoading(false);
      return;
    }
    try {
      const services = await withVaultUnlock(() => loadVault());
      setServiceCount(services.length);
    } catch {
      setServiceCount(undefined);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Delete Vault?",
      message:
        "This will permanently delete your encrypted vault and Keychain key.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    deleteVault();
    await showToast({ style: Toast.Style.Success, title: "Vault deleted" });
    check();
  }, [check]);

  const handleLock = useCallback(async () => {
    lockVault();
    await showToast({
      style: Toast.Style.Success,
      title: "Vault locked",
      message:
        "Next command launch will require Keychain auth (close any open Search/Recent views first)",
    });
  }, []);

  const statusIcon = (ok: boolean) =>
    ok
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : { source: Icon.XMarkCircle, tintColor: Color.Red };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Status">
        <List.Item
          icon={statusIcon(vaultExists)}
          title="Vault"
          subtitle={vaultExists ? "Configured" : "Not configured"}
          accessories={
            serviceCount !== undefined
              ? [{ text: `${serviceCount} services` }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                onAction={check}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Actions">
        {!vaultExists && (
          <>
            <List.Item
              icon={Icon.Download}
              title="1. Export from 2FAS"
              subtitle="Settings > 2FAS Backup > Export (with password)"
            />
            <List.Item
              icon={Icon.ArrowRight}
              title="2. Import Vault"
              subtitle="Import your .2fas export file"
              actions={
                <ActionPanel>
                  <Action
                    title="Open Import"
                    icon={Icon.Download}
                    onAction={() =>
                      launchCommand({
                        name: "import-vault",
                        type: LaunchType.UserInitiated,
                      })
                    }
                  />
                </ActionPanel>
              }
            />
          </>
        )}
        {vaultExists && (
          <>
            <List.Item
              icon={Icon.ArrowClockwise}
              title="Re-import Vault"
              subtitle="Update services from a new 2FAS export"
              actions={
                <ActionPanel>
                  <Action
                    title="Re-Import"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      launchCommand({
                        name: "import-vault",
                        type: LaunchType.UserInitiated,
                      })
                    }
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Lock}
              title="Lock Vault Now"
              subtitle="Clear in-memory cache; next code requires Keychain auth"
              actions={
                <ActionPanel>
                  <Action
                    title="Lock Vault"
                    icon={Icon.Lock}
                    onAction={handleLock}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              title="Delete Vault"
              subtitle="Remove vault and Keychain key"
              actions={
                <ActionPanel>
                  <Action
                    title="Delete Vault"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleDelete}
                  />
                </ActionPanel>
              }
            />
          </>
        )}
      </List.Section>
    </List>
  );
}
