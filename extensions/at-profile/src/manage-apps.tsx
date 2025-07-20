import { ActionPanel, Action, List, showToast, Toast, Icon, confirmAlert, Alert, Color, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { defaultSites, getCustomPlatforms, getPlatformSettings, updatePlatformSettings } from "./sites";
import { removeCustomApp } from "./custom-platform-utils";
import CustomPlatformForm from "./custom-platform-form";
import { exportSettingsToFile, importSettingsFromFile, generateSampleYAML } from "./yaml-settings";

interface PlatformItem {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  isDefault: boolean;
}

export default function ManageAppsCommand() {
  const [platforms, setPlatforms] = useState<PlatformItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPlatforms = async () => {
    try {
      setIsLoading(true);
      const [customPlatforms, platformSettings] = await Promise.all([getCustomPlatforms(), getPlatformSettings()]);

      // Convert platform settings to a map for quick lookup
      const settingsMap = new Map<string, boolean>();
      platformSettings.forEach((setting) => {
        settingsMap.set(setting.value, setting.enabled);
      });

      // Combine default and custom platforms
      const allPlatforms: PlatformItem[] = [
        // Default platforms
        ...defaultSites.map((site) => ({
          id: site.value,
          name: site.name,
          url: site.urlTemplate,
          enabled: settingsMap.get(site.value) ?? true, // Default to enabled
          isDefault: true,
        })),
        // Custom platforms (they don't have separate IDs in sites.ts, use value as ID)
        ...customPlatforms.map((platform) => ({
          id: platform.value,
          name: platform.name,
          url: platform.urlTemplate,
          enabled: settingsMap.get(platform.value) ?? true, // Default to enabled
          isDefault: false,
        })),
      ];

      setPlatforms(allPlatforms);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Platforms",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlatforms();
  }, []);

  const togglePlatformEnabled = async (platformId: string, enabled: boolean) => {
    try {
      const currentSettings = await getPlatformSettings();

      // Update or add platform setting
      const existingSettingIndex = currentSettings.findIndex((s) => s.value === platformId);
      if (existingSettingIndex >= 0) {
        currentSettings[existingSettingIndex].enabled = enabled;
      } else {
        currentSettings.push({ value: platformId, enabled });
      }

      await updatePlatformSettings(currentSettings);

      // Update local state
      setPlatforms((prev) =>
        prev.map((platform) => (platform.id === platformId ? { ...platform, enabled } : platform)),
      );

      await showToast({
        style: Toast.Style.Success,
        title: enabled ? "Platform Enabled" : "Platform Disabled",
        message: `${platforms.find((p) => p.id === platformId)?.name} has been ${enabled ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Platform",
        message: (error as Error).message,
      });
    }
  };

  const handleDeleteCustomPlatform = async (platform: PlatformItem) => {
    if (platform.isDefault) return; // Safety check

    const confirmed = await confirmAlert({
      title: "Delete Custom Platform",
      message: `Are you sure you want to delete "${platform.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      const result = await removeCustomApp(platform.id);
      if (result.success) {
        setPlatforms((prev) => prev.filter((p) => p.id !== platform.id));
      }
    } catch (error) {
      // Error handling and toasts are managed by the utility functions
      console.error("Error deleting platform:", error);
    }
  };

  const defaultPlatforms = platforms.filter((p) => p.isDefault);
  const customPlatforms = platforms.filter((p) => !p.isDefault);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search platforms...">
      <List.Section title="Default Social Apps">
        {defaultPlatforms.map((platform) => (
          <List.Item
            key={platform.id}
            title={platform.name}
            subtitle={platform.url}
            icon={{
              source: platform.enabled ? Icon.CheckCircle : Icon.Circle,
              tintColor: platform.enabled ? Color.Green : Color.SecondaryText,
            }}
            accessories={[{ text: platform.enabled ? "Enabled" : "Disabled" }]}
            actions={
              <ActionPanel>
                <Action
                  title={platform.enabled ? "Disable" : "Enable"}
                  icon={platform.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                  onAction={() => togglePlatformEnabled(platform.id, !platform.enabled)}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Add Custom Social App"
                    icon={Icon.Plus}
                    target={<CustomPlatformForm onSave={loadPlatforms} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Open Quick Profile Search"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      // Open the quick-open command - note: in Raycast, you would typically navigate via deep links
                      // For now, we'll add it as a visual reminder that this functionality exists
                      showToast({
                        style: Toast.Style.Success,
                        title: "Quick Profile Search",
                        message: "Use the 'Open Profile' command to quickly search profiles",
                      });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Custom Social Apps">
        {customPlatforms.length === 0 ? (
          <List.Item
            title="No Custom Platforms"
            subtitle="Add custom social platforms to extend the available options"
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Custom Social App"
                  icon={Icon.Plus}
                  target={<CustomPlatformForm onSave={loadPlatforms} />}
                />
              </ActionPanel>
            }
          />
        ) : (
          customPlatforms.map((platform) => (
            <List.Item
              key={platform.id}
              title={platform.name}
              subtitle={platform.url}
              icon={{
                source: platform.enabled ? Icon.CheckCircle : Icon.Circle,
                tintColor: platform.enabled ? Color.Green : Color.SecondaryText,
              }}
              accessories={[{ text: platform.enabled ? "Enabled" : "Disabled" }]}
              actions={
                <ActionPanel>
                  <Action
                    title={platform.enabled ? "Disable" : "Enable"}
                    icon={platform.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                    onAction={() => togglePlatformEnabled(platform.id, !platform.enabled)}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Edit"
                      icon={Icon.Pencil}
                      target={
                        <CustomPlatformForm
                          platform={{
                            id: platform.id,
                            name: platform.name,
                            url: platform.url,
                            enabled: platform.enabled,
                          }}
                          onSave={loadPlatforms}
                        />
                      }
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <Action
                      title="Delete"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteCustomPlatform(platform)}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Add Custom Social App"
                      icon={Icon.Plus}
                      target={<CustomPlatformForm onSave={loadPlatforms} />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
      <List.Section title="YAML Settings">
        <List.Item
          title="Export Settings to File"
          icon={Icon.Download}
          actions={
            <ActionPanel>
              <Action
                title="Export"
                icon={Icon.Download}
                onAction={async () => {
                  try {
                    const filePath = await exportSettingsToFile();
                    await Clipboard.copy(filePath);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Settings Exported",
                      message: "File path copied to clipboard",
                    });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Export Failed",
                      message: error instanceof Error ? error.message : "Unknown error",
                    });
                  }
                }}
              />
              <Action
                title="Generate Sample Yaml"
                icon={Icon.Document}
                onAction={async () => {
                  await Clipboard.copy(generateSampleYAML());
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Sample YAML Copied",
                    message: "Sample YAML content copied to clipboard",
                  });
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Import Settings from File"
          icon={Icon.Upload}
          actions={
            <ActionPanel>
              <Action
                title="Import"
                icon={Icon.Upload}
                onAction={async () => {
                  try {
                    await importSettingsFromFile();
                    await loadPlatforms(); // Reload the platforms after import
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Import Failed",
                      message: error instanceof Error ? error.message : "Unknown error",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
