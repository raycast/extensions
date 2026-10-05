import { List, Icon, ActionPanel, Action, Keyboard } from "@raycast/api";
import { ComputeInstance, ComputeService } from "../ComputeService";
import { useStreamerMode } from "../../../utils/useStreamerMode";
import { maskIPIfEnabled } from "../../../utils/maskSensitiveData";
import { StreamerModeAction } from "../../../components/StreamerModeAction";
import { CloudShellAction } from "../../../components/CloudShellAction";
import {
  ComputeLifecycleAction,
  getInstanceLifecycleActions,
  getInstanceStatusPresentation,
} from "../instanceLifecycle";

interface InstanceListItemProps {
  instance: ComputeInstance;
  service: ComputeService | null;
  projectId: string;
  onViewDetails: (instance: ComputeInstance) => void;
  onInstanceAction: (instance: ComputeInstance, action: ComputeLifecycleAction) => Promise<void>;
  onSshCommand: (instance: ComputeInstance) => void;
  onCreateVM: () => void;
}

export default function InstanceListItem({
  instance,
  service,
  projectId,
  onViewDetails,
  onInstanceAction,
  onSshCommand,
  onCreateVM,
}: InstanceListItemProps) {
  const { isEnabled: isStreamerMode } = useStreamerMode();

  const statusIcon = getInstanceStatusPresentation(instance.status);
  const lifecycleActions = getInstanceLifecycleActions(instance.status);

  // Format zone and machine type for display
  const zone = service?.formatZone(instance.zone) || instance.zone;
  const machineType = service?.formatMachineType(instance.machineType) || instance.machineType;

  // Get internal and external IPs if available (masked if streamer mode)
  const rawInternalIP = instance.networkInterfaces?.[0]?.networkIP || "N/A";
  const rawExternalIP = instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP || "None";
  const internalIP = rawInternalIP === "N/A" ? "N/A" : maskIPIfEnabled(rawInternalIP, isStreamerMode);
  const externalIP = rawExternalIP === "None" ? "None" : maskIPIfEnabled(rawExternalIP, isStreamerMode);

  return (
    <List.Item
      id={instance.id}
      title={instance.name}
      subtitle={`${statusIcon.text} | ${zone}`}
      accessories={[{ text: machineType }, { text: `Internal: ${internalIP}` }, { text: `External: ${externalIP}` }]}
      icon={{ source: statusIcon.icon, tintColor: statusIcon.color }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Instance Actions">
            <Action title="View Details" icon={{ source: Icon.Sidebar }} onAction={() => onViewDetails(instance)} />
            {lifecycleActions.map((action) => (
              <Action
                key={action.kind}
                title={action.title}
                icon={{ source: action.icon, tintColor: action.tintColor }}
                onAction={() => onInstanceAction(instance, action.kind)}
              />
            ))}
            {instance.status.toLowerCase() === "running" && (
              <Action
                title="Copy SSH Command"
                icon={{ source: Icon.Terminal }}
                onAction={() => onSshCommand(instance)}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="VM Management">
            <Action
              title="Create Vm Instance"
              icon={{ source: Icon.Plus }}
              onAction={onCreateVM}
              shortcut={Keyboard.Shortcut.Common.New}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Cloud Shell">
            <CloudShellAction projectId={projectId} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Privacy">
            <StreamerModeAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
