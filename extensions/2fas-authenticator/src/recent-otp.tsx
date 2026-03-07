import { useState, useEffect, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
} from "@raycast/api";
import { loadVault, isVaultConfigured, type VaultService } from "./lib/vault";
import { generateCodeForService } from "./lib/totp";
import {
  getCachedServices,
  removeService,
  togglePin,
  addRecentService,
  sortServices,
  type CachedService,
} from "./lib/cache";
import { KeychainAuthCancelled } from "./lib/keychain";

export default function RecentOTP() {
  const [entries, setEntries] = useState<CachedService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    const cached = await getCachedServices();
    setEntries(sortServices(cached));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleCopyOTP = useCallback(async (entry: CachedService) => {
    if (!isVaultConfigured()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No vault configured",
      });
      return;
    }
    try {
      const services = loadVault();
      const service = services.find(
        (s: VaultService) => s.id === entry.serviceId,
      );
      if (!service) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Service not found in vault",
        });
        return;
      }
      const totp = generateCodeForService(service);
      await Clipboard.copy(totp.code, { concealed: true });
      await addRecentService(service.id, service.issuer || service.name);
      await showToast({
        style: Toast.Style.Success,
        title: `Copied: ${totp.code}`,
      });
      await popToRoot();
    } catch (error) {
      if (error instanceof KeychainAuthCancelled) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication cancelled",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to generate OTP",
        });
      }
    }
  }, []);

  const handleRemove = useCallback(
    async (serviceId: string) => {
      await removeService(serviceId);
      await loadEntries();
      await showToast({ style: Toast.Style.Success, title: "Removed" });
    },
    [loadEntries],
  );

  const handleTogglePin = useCallback(
    async (serviceId: string) => {
      await togglePin(serviceId);
      await loadEntries();
    },
    [loadEntries],
  );

  if (entries.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clock}
          title="No recent services"
          description='Use "Search OTP" first to build your recent list'
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {entries.map((entry) => (
        <List.Item
          key={entry.serviceId}
          icon={entry.pinned ? Icon.Pin : Icon.Clock}
          title={entry.displayName}
          accessories={[
            {
              text: new Date(entry.lastUsed).toLocaleDateString(),
              tooltip: "Last used",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Copy OTP"
                icon={Icon.Clipboard}
                onAction={() => handleCopyOTP(entry)}
              />
              <Action
                title={entry.pinned ? "Unpin" : "Pin"}
                icon={entry.pinned ? Icon.PinDisabled : Icon.Pin}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => handleTogglePin(entry.serviceId)}
              />
              <Action
                title="Remove from Recents"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleRemove(entry.serviceId)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
