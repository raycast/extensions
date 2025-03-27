import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getInstalledApps, restartMultipleApps } from "./app-utils";
import {
  AppConfig,
  AppItem,
  addAppConfig,
  deleteAppConfig,
  getAppConfigs,
  migrateConfigsIfNeeded,
  updateAppConfig,
} from "./storage";

export default function ManageConfigsViewComponent() {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // Migrate configs if needed
        await migrateConfigsIfNeeded();
        const savedConfigs = await getAppConfigs();
        setConfigs(savedConfigs);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load configurations",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleDelete(id: string) {
    try {
      await deleteAppConfig(id);
      setConfigs(configs.filter((config) => config.id !== id));
      await showToast({
        style: Toast.Style.Success,
        title: "Configuration deleted",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete configuration",
        message: String(error),
      });
    }
  }

  async function handleRestart(config: AppConfig) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Restarting apps in ${config.name}`,
      });

      await restartMultipleApps(config.apps);

      await showToast({
        style: Toast.Style.Success,
        title: `Restarted apps in ${config.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to restart apps",
        message: String(error),
      });
    }
  }

  async function handleCreateCommandQuickLink(config: AppConfig) {
    try {
      // Create the properly encoded quicklink URL
      const extensionId = environment.extensionName;
      const commandName = "execute-app-restart";

      // Encode the arguments properly
      const encodedArgs = encodeURIComponent(JSON.stringify({ configId: config.id }));

      // Create the full URL
      const quicklinkUrl = `raycast://extensions/fahl/${extensionId}/${commandName}?arguments=${encodedArgs}`;

      // Copy the quicklink URL to clipboard
      await Clipboard.copy(quicklinkUrl);

      // Show instructions to the user
      const options: Alert.Options = {
        title: `Quicklink Setup`,
        message:
          'A quicklink URL has been copied to your clipboard. Paste it into the "Link" input when creating a quicklink.',
        primaryAction: {
          title: "Got It",
        },
      };

      await confirmAlert(options);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create shortcut",
        message: String(error),
      });
    }
  }

  // Function to refresh the configurations list
  async function refreshConfigs() {
    setIsLoading(true);
    const savedConfigs = await getAppConfigs();
    setConfigs(savedConfigs);
    setIsLoading(false);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search configurations..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Configuration"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<ConfigForm onSave={refreshConfigs} />}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.AppWindowList}
        title="No configurations yet"
        description="Add a new app configuration to get started"
        actions={
          <ActionPanel>
            <Action.Push title="Add Configuration" icon={Icon.Plus} target={<ConfigForm onSave={refreshConfigs} />} />
          </ActionPanel>
        }
      />
      {configs.map((config) => (
        <List.Item
          key={config.id}
          title={config.name}
          accessories={[{ text: `${config.apps.length} app(s)` }]}
          actions={
            <ActionPanel>
              <Action title="Restart Apps" icon={Icon.ArrowClockwise} onAction={() => handleRestart(config)} />
              <Action.Push
                title="Edit Configuration"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<ConfigForm config={config} onSave={refreshConfigs} />}
              />
              <Action
                title="Create Quicklink URL"
                icon={Icon.Keyboard}
                onAction={() => handleCreateCommandQuickLink(config)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              />
              <Action
                title="Delete Configuration"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(config.id)}
              />
              <ActionPanel.Section title="More Actions">
                <Action.Push
                  title="Add Configuration"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<ConfigForm onSave={refreshConfigs} />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ConfigForm({ config, onSave }: { config?: AppConfig; onSave: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [installedApps, setInstalledApps] = useState<{ name: string; bundleId: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataReady, setDataReady] = useState<boolean>(false);
  const [configName, setConfigName] = useState<string>(config?.name || "");
  const [appItems, setAppItems] = useState<AppItem[]>(config?.apps || [{ bundleId: "", startupArgs: "" }]);
  const [selectedAppIndex, setSelectedAppIndex] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadApps() {
      try {
        setIsLoading(true);
        setDataReady(false);
        setLoadError(null);

        // Get all installed applications
        const apps = await getInstalledApps();

        if (apps.length === 0) {
          setLoadError("No applications found. Please check permissions.");
        } else {
          setInstalledApps(apps);

          // If editing an existing config, set the initial values
          if (config) {
            setConfigName(config.name);
            setAppItems(config.apps);
          }

          // Set data ready flag to true
          setDataReady(true);
        }
      } catch (error) {
        setLoadError(`Failed to load applications: ${error}`);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load installed apps",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadApps();
  }, [config]);

  async function handleSubmit(values: { configName: string }) {
    try {
      // Validate configuration name
      if (values.configName.trim() === "") {
        throw new Error("Configuration name is required");
      }

      // Filter out any empty app items
      const validAppItems = appItems.filter((item) => item.bundleId.trim() !== "");

      if (validAppItems.length === 0) {
        throw new Error("Please add at least one app to the configuration");
      }

      if (config) {
        await updateAppConfig({
          ...config,
          name: values.configName,
          apps: validAppItems,
        });
      } else {
        await addAppConfig({
          name: values.configName,
          apps: validAppItems,
        });
      }

      await showToast({
        style: Toast.Style.Success,
        title: config ? "Configuration updated" : "Configuration added",
      });

      await onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save configuration",
        message: String(error),
      });
    }
  }

  function handleAppChange(index: number, field: keyof AppItem, value: string) {
    const updatedAppItems = [...appItems];
    updatedAppItems[index] = { ...updatedAppItems[index], [field]: value };
    setAppItems(updatedAppItems);
  }

  function addAppItem() {
    setAppItems([...appItems, { bundleId: "", startupArgs: "" }]);
  }

  function removeAppItem(index: number) {
    const updatedAppItems = [...appItems];
    updatedAppItems.splice(index, 1);
    setAppItems(updatedAppItems);
  }

  function handleFocus(index: number) {
    setSelectedAppIndex(index);
  }

  // Helper function to get app name from bundleId
  function getAppName(bundleId: string): string {
    if (!bundleId) return "";
    const app = installedApps.find((app) => app.bundleId === bundleId);
    return app ? app.name : bundleId.split(".").pop() || "";
  }

  function getAppDisplayName(index: number, bundleId: string): string {
    const appName = getAppName(bundleId);
    const displayName = `App ${index + 1}`;
    if (appName) {
      return `${displayName} - ${appName}`;
    }
    return displayName;
  }

  return (
    <Form
      navigationTitle={config ? "Edit Configuration" : "Add Configuration"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" onSubmit={handleSubmit} />
          {dataReady && (
            <>
              <Action
                title="Add App"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={addAppItem}
              />
              {appItems.length > 1 && (
                <Action
                  title={`Remove ${getAppDisplayName(selectedAppIndex, appItems[selectedAppIndex].bundleId)}`}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => removeAppItem(selectedAppIndex)}
                />
              )}
            </>
          )}
        </ActionPanel>
      }
    >
      {loadError ? (
        <Form.Description text={loadError} />
      ) : (
        <>
          <Form.TextField
            id="configName"
            title="Configuration Name"
            placeholder="Enter configuration name (e.g. 'Restart Browser')"
            value={configName}
            onChange={setConfigName}
            error={configName.trim() === "" ? "Configuration name is required" : undefined}
          />

          {/* <Form.Description text="Apps to Restart" /> */}

          <Form.Separator />

          {dataReady ? (
            appItems.map((appItem, index) => (
              <React.Fragment key={index}>
                <Form.Description text={getAppDisplayName(index, appItem.bundleId)} />
                <Form.Dropdown
                  id={`app-${index}-bundleId`}
                  title="App"
                  value={appItem.bundleId}
                  onChange={(value) => handleAppChange(index, "bundleId", value)}
                  onFocus={() => handleFocus(index)}
                  filtering={true}
                >
                  {installedApps.map((app) => (
                    <Form.Dropdown.Item key={app.bundleId} value={app.bundleId} title={app.name} />
                  ))}
                </Form.Dropdown>

                <Form.TextField
                  id={`app-${index}-args`}
                  title="Startup Arguments"
                  placeholder="Optional arguments for app startup"
                  value={appItem.startupArgs || ""}
                  onChange={(value) => handleAppChange(index, "startupArgs", value)}
                  onFocus={() => handleFocus(index)}
                />

                {appItems.length > 1 && <Form.Description text={`Use ⌘⌫ to remove this app or ⌘N to add more apps`} />}
              </React.Fragment>
            ))
          ) : (
            <Form.Description text="Loading available applications..." />
          )}

          {dataReady && <Form.Description text={`Use ⌘N to add more apps`} />}
        </>
      )}
    </Form>
  );
}
