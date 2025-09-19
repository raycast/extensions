import React, { useEffect, useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  LocalStorage,
  popToRoot,
} from "@raycast/api";
import { VaultDetector, ObsidianVault } from "./services/vaultDetector";
import * as path from "path";

const SELECTED_VAULT_KEY = "selectedVaultPath";

export default function SelectVault() {
  const [vaults, setVaults] = useState<ObsidianVault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVaultPath, setSelectedVaultPath] = useState<string>("");
  const vaultDetector = new VaultDetector();

  useEffect(() => {
    async function loadVaults() {
      try {
        // Get current selected vault from LocalStorage
        const currentPath =
          (await LocalStorage.getItem<string>(SELECTED_VAULT_KEY)) || "";
        setSelectedVaultPath(currentPath);

        // Load all available vaults
        const detectedVaults = await vaultDetector.getAllVaults();

        if (detectedVaults.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No Vaults Found",
            message: "No Obsidian vaults were detected on your system",
          });
          return;
        }

        setVaults(detectedVaults);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to detect vaults",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadVaults();
  }, []);

  const selectVault = async (vault: ObsidianVault) => {
    try {
      // Save to LocalStorage for persistence
      await LocalStorage.setItem(SELECTED_VAULT_KEY, vault.path);
      setSelectedVaultPath(vault.path);

      showToast({
        style: Toast.Style.Success,
        title: "Vault Selected",
        message: `Now using: ${vault.name}`,
      });

      // Return to the main command
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to select vault",
        message: String(error),
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search vaults...">
      {vaults.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Vaults Found"
          description="No Obsidian vaults were detected on your system."
        />
      ) : (
        vaults.map((vault) => {
          const isSelected = vault.path === selectedVaultPath;
          const subtitle = vault.path.replace(process.env.HOME || "", "~");

          return (
            <List.Item
              key={vault.path}
              title={vault.name || path.basename(vault.path)}
              subtitle={subtitle}
              icon={Icon.Folder}
              accessories={[
                ...(isSelected
                  ? [{ icon: Icon.CheckCircle, tooltip: "Currently selected" }]
                  : []),
                ...(vault.ts
                  ? [
                      {
                        text: new Date(vault.ts).toLocaleDateString(),
                        tooltip: "Last opened",
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Selected" : "Select This Vault"}
                    icon={Icon.CheckCircle}
                    onAction={() => selectVault(vault)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
