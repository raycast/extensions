import {
  ActionPanel,
  Action,
  Detail,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { GCloudConfig } from "../types";
import { activateConfiguration, deleteConfiguration } from "../ConfigurationsService";
import { friendlyErrorMessage } from "../../../utils/errorMessages";

interface Props {
  config: GCloudConfig;
  gcloudPath: string;
  onRefresh: () => Promise<void>;
}

export function ConfigurationDetailView({ config, gcloudPath, onRefresh }: Props) {
  const { pop } = useNavigation();

  const project = config.properties?.core?.project ?? "Not set";
  const account = config.properties?.core?.account ?? "Not set";
  const region = config.properties?.compute?.region ?? "Not set";

  const markdown = `# ${config.name}\n\n${config.is_active ? "**Active configuration**" : "Inactive configuration"}`;

  async function handleActivate() {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Activating ${config.name}...` });
    try {
      await activateConfiguration(gcloudPath, config.name);
      toast.style = Toast.Style.Success;
      toast.title = `Activated ${config.name}`;
      await onRefresh();
      pop();
    } catch (error) {
      const friendly = friendlyErrorMessage(error, "Failed to activate");
      toast.style = Toast.Style.Failure;
      toast.title = friendly.title;
      toast.message = friendly.message;
    }
  }

  async function handleDelete() {
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
      await onRefresh();
      pop();
    } catch (error) {
      const friendly = friendlyErrorMessage(error, "Failed to delete");
      toast.style = Toast.Style.Failure;
      toast.title = friendly.title;
      toast.message = friendly.message;
    }
  }

  return (
    <Detail
      navigationTitle={config.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={config.name} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={config.is_active ? "Active" : "Inactive"}
              color={config.is_active ? Color.Green : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Project" text={project} icon={Icon.Box} />
          <Detail.Metadata.Label title="Account" text={account} icon={Icon.Person} />
          <Detail.Metadata.Label title="Region" text={region} icon={Icon.Globe} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!config.is_active && (
            <Action title="Activate Configuration" icon={Icon.CheckCircle} onAction={handleActivate} />
          )}
          {!config.is_active && (
            <Action
              title="Delete Configuration"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={handleDelete}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
