import { List, showToast, Toast, Icon, confirmAlert, Alert, Color, Clipboard, LaunchProps, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { getCustomApps, getAppSettings, updateAppSettings, getAppFavicon } from "../hooks/apps";
import { defaultApps } from "../types/default-apps";
import { removeCustomApp } from "./custom-app-utils";
import { AppManagementActionPanels, UtilityActionPanels } from "../components";
import { exportSettingsToFile, importSettingsFromFile } from "../yaml-settings";
import { AppItem, ManageAppsArguments, App } from "../types";

export default function ManageAppsCommand(props: LaunchProps<{ arguments: ManageAppsArguments }>) {
  const { action } = props.arguments;
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadApps = async () => {
    try {
      setIsLoading(true);
      const [customApps, appSettings] = await Promise.all([getCustomApps(), getAppSettings()]);

      // Convert app settings to a map for quick lookup
      const settingsMap = new Map<string, boolean>();
      appSettings.forEach((setting) => {
        settingsMap.set(setting.value, setting.enabled);
      });

      // Combine default and custom apps
      const allApps: AppItem[] = [
        // Default apps
        ...defaultApps.map((app) => ({
          id: app.value,
          name: app.name,
          value: app.value,
          url: app.urlTemplate,
          urlTemplate: app.urlTemplate,
          enabled: settingsMap.get(app.value) ?? true, // Default to enabled
          isDefault: true,
          icon: getAppFavicon(app),
        })),
        // Custom apps (they don't have separate IDs in apps.ts, use value as ID)
        ...customApps.map((app) => ({
          id: app.value,
          name: app.name,
          value: app.value,
          url: app.urlTemplate,
          urlTemplate: app.urlTemplate,
          enabled: settingsMap.get(app.value) ?? true, // Default to enabled
          isDefault: false,
          icon: getAppFavicon(app),
        })),
      ];

      setApps(allApps);
    } catch (error) {
      await showFailureToast((error as Error).message, { title: "Failed to Load Social Apps" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportApps = async () => {
    try {
      const filePath = await exportSettingsToFile();
      await Clipboard.copy(filePath);
      await showToast({
        style: Toast.Style.Success,
        title: "Apps Exported",
        message: "File path copied to clipboard",
      });
    } catch (error) {
      await showFailureToast(error instanceof Error ? error.message : "Unknown error", { title: "Export Failed" });
    }
  };

  const handleImportApps = async () => {
    try {
      await importSettingsFromFile();
      await loadApps(); // Reload the apps after import
    } catch (error) {
      await showFailureToast(error instanceof Error ? error.message : "Unknown error", { title: "Import Failed" });
    }
  };

  useEffect(() => {
    loadApps();

    // Handle command line arguments for import/export
    if (action === "import") {
      handleImportApps();
    } else if (action === "export") {
      handleExportApps();
    }
  }, [action]);

  const toggleAppEnabled = async (appId: string, enabled: boolean) => {
    try {
      const currentSettings = await getAppSettings();

      // Update or add app setting
      const existingSettingIndex = currentSettings.findIndex((s) => s.value === appId);
      if (existingSettingIndex >= 0) {
        currentSettings[existingSettingIndex].enabled = enabled;
      } else {
        currentSettings.push({ value: appId, enabled });
      }

      await updateAppSettings(currentSettings);

      // Update local state
      setApps((prev) => prev.map((app) => (app.id === appId ? { ...app, enabled } : app)));

      await showToast({
        style: Toast.Style.Success,
        title: enabled ? "Social App Shown" : "Social App Hidden",
        message: `${apps.find((p) => p.id === appId)?.name} is now ${enabled ? "shown" : "hidden"} in Open Profile`,
      });
    } catch (error) {
      await showFailureToast((error as Error).message, { title: "Failed to Update Social App" });
    }
  };

  const handleDeleteCustomApp = async (app: AppItem) => {
    if (app.isDefault) return; // Safety check

    const confirmed = await confirmAlert({
      title: "Delete Custom Social App",
      message: `Are you sure you want to delete "${app.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      const result = await removeCustomApp(app.id);
      if (result.success) {
        setApps((prev) => prev.filter((p) => p.id !== app.id));
      }
    } catch (error) {
      // Error handling and toasts are managed by the utility functions
      console.error("Error deleting app:", error);
    }
  };

  const openQuickProfileSearch = async (appValue: string) => {
    try {
      // Verify the app exists before creating the deep link
      const { getAllAppsUnfiltered } = await import("../hooks/apps");
      const allApps = await getAllAppsUnfiltered();
      const targetApp = allApps.find((app) => app.value === appValue);

      if (!targetApp) {
        throw new Error(`App with value "${appValue}" not found`);
      }

      // Check if the app is currently hidden and show it implicitly
      const currentApp = apps.find((app) => app.value === appValue);
      if (currentApp && !currentApp.enabled) {
        // Implicitly show the app since user is directly opening it
        await toggleAppEnabled(appValue, true);

        await showToast({
          style: Toast.Style.Success,
          title: "App Shown",
          message: `${targetApp.name} is now shown in Open Profile`,
        });
      }

      // Use raycast:// deep link to open the Open Profile command with the specific app pre-selected
      const url = `raycast://extensions/chrismessina/at-profile/open-profile?arguments=${encodeURIComponent(
        JSON.stringify({ app: appValue }),
      )}`;

      await open(url);

      await showToast({
        style: Toast.Style.Success,
        title: "Opening Profile Search",
        message: `Opening with ${targetApp.name} selected`,
      });
    } catch (error) {
      await showFailureToast(error instanceof Error ? error.message : "Unknown error", {
        title: "Failed to Open Profile Search",
      });
    }
  };

  const defaultAppList = apps.filter((p) => p.isDefault).sort((a, b) => a.name.localeCompare(b.name));
  const customAppList = apps.filter((p) => !p.isDefault).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search social apps...">
      <List.Section title="Default Social Apps">
        {defaultAppList.map((app) => (
          <List.Item
            key={app.id}
            title={app.name}
            subtitle={app.url}
            icon={getAppFavicon({
              name: app.name,
              value: app.value,
              urlTemplate: app.urlTemplate,
            } as App)}
            accessories={[
              {
                icon: {
                  source: app.enabled ? Icon.CheckCircle : Icon.Circle,
                  tintColor: app.enabled ? Color.Green : Color.SecondaryText,
                },
                tooltip: app.enabled ? "Shown" : "Hidden",
              },
            ]}
            actions={
              <AppManagementActionPanels
                type="default"
                app={app}
                onToggleEnabled={toggleAppEnabled}
                onOpenQuickProfileSearch={openQuickProfileSearch}
                onSave={loadApps}
              />
            }
          />
        ))}
      </List.Section>

      <List.Section title="Custom Social Apps">
        {customAppList.length === 0 ? (
          <List.Item
            title="No Custom Social Apps"
            subtitle="Add custom social apps to extend the available options"
            icon={Icon.Info}
            actions={<AppManagementActionPanels type="empty" onSave={loadApps} />}
          />
        ) : (
          customAppList.map((app) => (
            <List.Item
              key={app.id}
              title={app.name}
              subtitle={app.url}
              icon={getAppFavicon({
                name: app.name,
                value: app.value,
                urlTemplate: app.urlTemplate,
              } as App)}
              accessories={[
                {
                  icon: {
                    source: app.enabled ? Icon.CheckCircle : Icon.Circle,
                    tintColor: app.enabled ? Color.Green : Color.SecondaryText,
                  },
                  tooltip: app.enabled ? "Shown" : "Hidden",
                },
              ]}
              actions={
                <AppManagementActionPanels
                  type="custom"
                  app={app}
                  onToggleEnabled={toggleAppEnabled}
                  onDeleteCustomApp={handleDeleteCustomApp}
                  onSave={loadApps}
                />
              }
            />
          ))
        )}
      </List.Section>
      <List.Section title="App Management">
        <List.Item
          title="Export Apps"
          subtitle="Export all app settings and custom apps to YAML file"
          icon={Icon.Download}
          actions={<UtilityActionPanels type="export-management" />}
        />
        <List.Item
          title="Import Apps"
          subtitle="Import app settings and custom apps from YAML file"
          icon={Icon.Upload}
          actions={<UtilityActionPanels type="import-management" />}
        />
      </List.Section>
    </List>
  );
}
