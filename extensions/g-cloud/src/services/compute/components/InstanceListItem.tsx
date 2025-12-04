import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { ComputeInstance, ComputeService } from "../ComputeService";

interface InstanceListItemProps {
  instance: ComputeInstance;
  service: ComputeService | null;
  onViewDetails: (instance: ComputeInstance) => void;
  onStart: (instance: ComputeInstance) => Promise<void>;
  onStop: (instance: ComputeInstance) => Promise<void>;
  onSshCommand: (instance: ComputeInstance) => void;
  onCreateVM: () => void;
}

export default function InstanceListItem({
  instance,
  service,
  onViewDetails,
  onStart,
  onStop,
  onSshCommand,
  onCreateVM,
}: InstanceListItemProps) {
  // Get status icon and color
  const statusIcon = getStatusIcon(instance.status);

  // Format zone and machine type for display
  const zone = service?.formatZone(instance.zone) || instance.zone;
  const machineType = service?.formatMachineType(instance.machineType) || instance.machineType;

  // Get internal and external IPs if available
  const internalIP = instance.networkInterfaces?.[0]?.networkIP || "N/A";
  const externalIP = instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP || "None";

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
            {instance.status.toLowerCase() !== "running" && (
              <Action title="Start Instance" icon={{ source: Icon.Play }} onAction={() => onStart(instance)} />
            )}
            {instance.status.toLowerCase() === "running" && (
              <Action title="Stop Instance" icon={{ source: Icon.Stop }} onAction={() => onStop(instance)} />
            )}
            {instance.status.toLowerCase() === "running" && (
              <Action
                title="Copy Ssh Command"
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
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Helper function to get status icon and color
function getStatusIcon(status: string): { icon: string; color: Color; text: string } {
  const statusLower = status.toLowerCase();

  switch (statusLower) {
    case "running":
      return { icon: Icon.Circle, color: Color.Green, text: "Running" };
    case "terminated":
      return { icon: Icon.Circle, color: Color.Red, text: "Stopped" };
    case "stopping":
      return { icon: Icon.CircleProgress, color: Color.Orange, text: "Stopping" };
    case "provisioning":
    case "staging":
      return { icon: Icon.CircleProgress, color: Color.Blue, text: "Starting" };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText, text: status };
  }
}
