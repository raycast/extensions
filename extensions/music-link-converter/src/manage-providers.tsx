import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import type { ProviderConfig } from "./lib/types";
import { toggleProvider, setAllProvidersEnabled, getProviders, DEFAULT_PROVIDERS } from "./lib/store";
import { useLocalStorage } from "@raycast/utils";

const PROVIDERS_STORAGE_KEY = "music_providers";

type FilterType = "All" | "Enabled" | "Disabled";

export default function ManageProviders() {
  const [filter, setFilter] = useState<FilterType>("All");
  const { value: providers, setValue: setProviders } = useLocalStorage<ProviderConfig[]>(
    PROVIDERS_STORAGE_KEY,
    DEFAULT_PROVIDERS,
  );

  const filteredProviders = (providers || []).filter((provider) => {
    if (filter === "All") return true;
    return filter === "Enabled" ? provider.enabled : !provider.enabled;
  });

  const handleToggleProvider = async (key: ProviderConfig["key"]) => {
    const updated = await toggleProvider(key);
    if (updated) {
      // Refresh providers from LocalStorage to update the UI
      const refreshedProviders = await getProviders();
      setProviders(refreshedProviders);
      await showToast(Toast.Style.Success, `${updated.label} ${updated.enabled ? "enabled" : "disabled"}`);
    } else {
      await showToast(Toast.Style.Failure, "Provider not found");
    }
  };

  const handleEnableAllProviders = async () => {
    const count = await setAllProvidersEnabled(true);
    // Refresh providers from LocalStorage to update the UI
    const refreshedProviders = await getProviders();
    setProviders(refreshedProviders);
    await showToast(Toast.Style.Success, `Enabled ${count} providers`);
  };

  const handleDisableAllProviders = async () => {
    const count = await setAllProvidersEnabled(false);
    // Refresh providers from LocalStorage to update the UI
    const refreshedProviders = await getProviders();
    setProviders(refreshedProviders);
    await showToast(Toast.Style.Success, `Disabled ${count} providers`);
  };

  const enableAllAction = () => {
    return (
      <Action
        title="Enable All"
        onAction={handleEnableAllProviders}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "e" },
          Windows: { modifiers: ["ctrl", "shift"], key: "e" },
        }}
      />
    );
  };

  const disableAllAction = () => {
    return (
      <Action
        title="Disable All"
        onAction={handleDisableAllProviders}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "d" },
          Windows: { modifiers: ["ctrl", "shift"], key: "d" },
        }}
      />
    );
  };

  return (
    <List
      searchBarPlaceholder="Search providers..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(newValue) => setFilter(newValue as FilterType)}>
          <List.Dropdown.Item title="All" value="All" />
          <List.Dropdown.Item title="Enabled" value="Enabled" />
          <List.Dropdown.Item title="Disabled" value="Disabled" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          {enableAllAction()}
          {disableAllAction()}
        </ActionPanel>
      }
    >
      {filteredProviders.map((provider) => (
        <List.Item
          key={provider.key}
          title={provider.label}
          icon={provider.enabled ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action
                title={provider.enabled ? "Disable" : "Enable"}
                onAction={() => handleToggleProvider(provider.key)}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "e" },
                  Windows: { modifiers: ["ctrl"], key: "e" },
                }}
              />
              {enableAllAction()}
              {disableAllAction()}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
