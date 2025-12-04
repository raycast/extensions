import { List, Icon, confirmAlert, Alert, Color, Clipboard, LaunchProps } from "@raycast/api";
import { useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import { showSuccess, withErrorHandling, safeAsyncOperation } from "../utils/errors";
import { getCustomApps, getAppSettings, updateAppSettings, getAppFavicon } from "../helpers/apps";
import { defaultApps } from "../utils/default-apps";
import { removeCustomApp } from "../helpers/custom-app-utils";
import { AppManagementActionPanels, UtilityActionPanels } from "../components";
import { exportSettingsToFile, importSettingsFromFile } from "../yaml-settings";
import { AppItem, ManageAppsArguments, App } from "../types";

export default function ManageAppsCommand(props: LaunchProps<{ arguments: ManageAppsArguments }>) {
  const { action } = props.arguments;
  const {
    data: apps,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const [customApps, appSettings] = await Promise.all([getCustomApps(), getAppSettings()]);

      // Convert app settings to a map for quick lookup
      const settingsMap = new Map<string, boolean>();
      appSettings.forEach((setting) => {
        settingsMap.set(setting.value, setting.visible);
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
          visible: settingsMap.get(app.value) ?? true, // Default to visible
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
          visible: settingsMap.get(app.value) ?? true, // Default to visible
          isDefault: false,
          icon: getAppFavicon(app),
        })),
      ];

      return allApps;
    },
    [],
    { keepPreviousData: true },
  );

  const handleExportApps = withErrorHandling(
    async () => {
      const filePath = await exportSettingsToFile();
      await Clipboard.copy(filePath);
      await showSuccess("Apps Exported", "File path copied to clipboard");
    },
    "exporting apps",
    true,
    "Export Failed",
  );

  const handleImportApps = withErrorHandling(
    async () => {
      await importSettingsFromFile();
      await revalidate(); // Reload the apps after import
    },
    "importing apps",
    true,
    "Import Failed",
  );

  useEffect(() => {
    // Handle command line arguments for import/export
    if (action === "import") {
      handleImportApps();
    } else if (action === "export") {
      handleExportApps();
    }
  }, [action]);

  const toggleAppVisible = withErrorHandling(
    async (appId: string, visible: boolean) => {
      const currentSettings = await getAppSettings();

      // Update or add app setting
      const existingSettingIndex = currentSettings.findIndex((s) => s.value === appId);
      if (existingSettingIndex >= 0) {
        currentSettings[existingSettingIndex].visible = visible;
      } else {
        currentSettings.push({ value: appId, visible });
      }

      await updateAppSettings(currentSettings);

      // Refresh list after update
      await revalidate();

      await showSuccess(
        visible ? "App Shown" : "App Hidden",
        `${(apps ?? []).find((p) => p.id === appId)?.name} is now ${visible ? "shown" : "hidden"} in Open Profile`,
      );
    },
    "updating app visibility",
    true,
    "Failed to Update App",
  );

  const handleDeleteCustomApp = async (app: AppItem) => {
    if (app.isDefault) return; // Safety check

    const confirmed = await confirmAlert({
      title: "Delete Custom App",
      message: `Are you sure you want to delete "${app.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await safeAsyncOperation(
      async () => {
        const result = await removeCustomApp(app.id);
        if (result?.success) {
          await revalidate();
        }
      },
      "deleting custom app",
      {
        showToastOnError: false, // removeCustomApp already shows toasts
        rethrow: false,
      },
    );
  };

  const defaultAppList = (apps ?? []).filter((p) => p.isDefault).sort((a, b) => a.name.localeCompare(b.name));
  const customAppList = (apps ?? []).filter((p) => !p.isDefault).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search social apps...">
      <List.Section title="Default Apps">
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
                  source: app.visible ? Icon.CheckCircle : Icon.Circle,
                  tintColor: app.visible ? Color.Green : Color.SecondaryText,
                },
                tooltip: app.visible ? "Shown" : "Hidden",
              },
            ]}
            actions={
              <AppManagementActionPanels
                type="default"
                app={app}
                onToggleVisible={toggleAppVisible}
                onSave={revalidate}
              />
            }
          />
        ))}
      </List.Section>

      <List.Section title="Custom Apps">
        {customAppList.length === 0 ? (
          <List.Item
            title="No Custom Apps"
            subtitle="Add custom social apps to extend the available options"
            icon={Icon.Info}
            actions={<AppManagementActionPanels type="empty" onSave={revalidate} />}
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
                    source: app.visible ? Icon.CheckCircle : Icon.Circle,
                    tintColor: app.visible ? Color.Green : Color.SecondaryText,
                  },
                  tooltip: app.visible ? "Shown" : "Hidden",
                },
              ]}
              actions={
                <AppManagementActionPanels
                  type="custom"
                  app={app}
                  onToggleVisible={toggleAppVisible}
                  onDeleteCustomApp={handleDeleteCustomApp}
                  onSave={revalidate}
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
