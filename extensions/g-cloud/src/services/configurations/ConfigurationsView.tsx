import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { GCloudConfig } from "./types";
import { listConfigurations, activateConfiguration, deleteConfiguration } from "./ConfigurationsService";
import { friendlyErrorMessage } from "../../utils/errorMessages";
import { CreateConfigForm } from "./components/CreateConfigForm";
import { DuplicateConfigForm } from "./components/DuplicateConfigForm";
import { ConfigurationDetailView } from "./components/ConfigurationDetailView";

interface Props {
  gcloudPath: string;
  onSwitchAccount: () => void;
  onClearCache: () => void;
  onDoctor: () => void;
  onRefreshAll: () => void;
}

export function ConfigurationsView({ gcloudPath, onSwitchAccount, onClearCache, onDoctor, onRefreshAll }: Props) {
  const { push } = useNavigation();
  const [configs, setConfigs] = useState<GCloudConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listConfigurations(gcloudPath);
      setConfigs(result);
    } catch (error) {
      const friendly = friendlyErrorMessage(error, "Failed to load configurations");
      await showToast({ style: Toast.Style.Failure, title: friendly.title, message: friendly.message });
    } finally {
      setIsLoading(false);
    }
  }, [gcloudPath]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  async function handleActivate(config: GCloudConfig) {
    if (config.is_active) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Activating ${config.name}...` });
    try {
      await activateConfiguration(gcloudPath, config.name);
      toast.style = Toast.Style.Success;
      toast.title = `Activated ${config.name}`;
      await loadConfigs();
    } catch (error) {
      const friendly = friendlyErrorMessage(error, "Failed to activate configuration");
      toast.style = Toast.Style.Failure;
      toast.title = friendly.title;
      toast.message = friendly.message;
    }
  }

  async function handleDelete(config: GCloudConfig) {
    const confirmed = await confirmAlert({
      title: "Delete Configuration",
      message: `Are you sure you want to delete "${config.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${config.name}...` });
    try {
      await deleteConfiguration(gcloudPath, config.name);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${config.name}`;
      await loadConfigs();
    } catch (error) {
      const friendly = friendlyErrorMessage(error, "Failed to delete configuration");
      toast.style = Toast.Style.Failure;
      toast.title = friendly.title;
      toast.message = friendly.message;
    }
  }

  function openCreate() {
    push(<CreateConfigForm gcloudPath={gcloudPath} configs={configs} onCreated={loadConfigs} />);
  }

  function openDuplicate() {
    push(<DuplicateConfigForm gcloudPath={gcloudPath} configs={configs} onCreated={loadConfigs} />);
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Settings & Configuration"
      searchBarPlaceholder="Search configurations..."
    >
      <List.Section title="Named Configurations" subtitle={`${configs.length} total`}>
        {configs.map((config) => (
          <List.Item
            key={config.name}
            title={config.name}
            subtitle={config.properties?.core?.project ?? "No project set"}
            icon={
              config.is_active
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            accessories={[
              ...(config.properties?.core?.account ? [{ text: config.properties.core.account }] : []),
              ...(config.properties?.compute?.region ? [{ tag: config.properties.compute.region }] : []),
              ...(config.is_active ? [{ tag: { value: "active", color: Color.Green } }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="See Configuration"
                  icon={Icon.Eye}
                  onAction={() =>
                    push(<ConfigurationDetailView config={config} gcloudPath={gcloudPath} onRefresh={loadConfigs} />)
                  }
                />
                {!config.is_active && (
                  <Action
                    title="Activate Configuration"
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={() => handleActivate(config)}
                  />
                )}
                <Action
                  title="Create Configuration"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={openCreate}
                />
                <Action
                  title="Duplicate Configuration"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={openDuplicate}
                />
                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadConfigs}
                />
                {!config.is_active && (
                  <Action
                    title="Delete Configuration"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    onAction={() => handleDelete(config)}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
        {configs.length === 0 && !isLoading && (
          <List.Item
            title="No configurations found"
            actions={
              <ActionPanel>
                <Action title="Create Configuration" icon={Icon.Plus} onAction={openCreate} />
                <Action title="Refresh" icon={Icon.RotateClockwise} onAction={loadConfigs} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Extension Settings">
        <List.Item
          title="Switch Account"
          subtitle="Log in with a different Google account"
          icon={{ source: Icon.Person, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action title="Switch Account" icon={Icon.Person} onAction={onSwitchAccount} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Clear Cache"
          subtitle="Clear all cached data"
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Clear Cache" icon={Icon.Trash} style={Action.Style.Destructive} onAction={onClearCache} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Doctor"
          subtitle="Diagnose gcloud SDK configuration"
          icon={{ source: Icon.Heartbeat, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Open Doctor" icon={Icon.Heartbeat} onAction={onDoctor} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Refresh All"
          subtitle="Reload service counts"
          icon={{ source: Icon.RotateClockwise, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={onRefreshAll} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
