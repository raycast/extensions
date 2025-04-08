import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getInstalledApps, restartApp } from "./app-utils";
import { AppConfig, addAppConfig, deleteAppConfig, getAppConfigs, updateAppConfig } from "./storage";

export default function ManageConfigs() {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      setIsLoading(true);
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
        title: `Restarting ${config.name}`,
      });

      await restartApp(config.bundleId, config.delay);

      await showToast({
        style: Toast.Style.Success,
        title: `Restarted ${config.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to restart app",
        message: String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search configurations...">
      <List.EmptyView
        icon={Icon.AppWindowList}
        title="No configurations yet"
        description="Add a new app configuration to get started"
        actions={
          <ActionPanel>
            <Action.Push title="Add Configuration" icon={Icon.Plus} target={<ConfigForm onSave={loadConfigs} />} />
          </ActionPanel>
        }
      />
      {configs.map((config) => (
        <List.Item
          key={config.id}
          title={config.name}
          subtitle={`Delay: ${config.delay}ms`}
          accessories={[{ text: config.bundleId }]}
          actions={
            <ActionPanel>
              <Action title="Restart App" icon={Icon.ArrowClockwise} onAction={() => handleRestart(config)} />
              <Action.Push
                title="Edit Configuration"
                icon={Icon.Pencil}
                target={<ConfigForm config={config} onSave={loadConfigs} />}
              />
              <Action
                title="Delete Configuration"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(config.id)}
              />
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

  useEffect(() => {
    loadInstalledApps();
  }, []);

  async function loadInstalledApps() {
    try {
      setIsLoading(true);
      const apps = await getInstalledApps();
      setInstalledApps(apps);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load installed apps",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(values: { name: string; bundleId: string; delay: string }) {
    try {
      const delay = parseInt(values.delay, 10);

      if (isNaN(delay) || delay < 0) {
        throw new Error("Delay must be a positive number");
      }

      if (config) {
        await updateAppConfig({
          ...config,
          name: values.name,
          bundleId: values.bundleId,
          delay,
        });
      } else {
        await addAppConfig({
          name: values.name,
          bundleId: values.bundleId,
          delay,
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

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="App Name" defaultValue={config?.name} autoFocus />
      <Form.Dropdown id="bundleId" title="App" defaultValue={config?.bundleId}>
        {installedApps.map((app) => (
          <Form.Dropdown.Item key={app.bundleId} value={app.bundleId} title={app.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="delay"
        title="Delay (ms)"
        placeholder="500"
        defaultValue={config?.delay.toString()}
        info="Time to wait between quitting and relaunching the app"
      />
    </Form>
  );
}
