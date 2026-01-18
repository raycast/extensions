import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useStacks, portainerApi } from "./hooks/usePortainer";
import { Stack } from "./api/types";
import {
  STACK_STATUS_COLORS,
  STACK_STATUS_ICONS,
  STACK_STATUS_LABELS,
  DEFAULT_ICONS,
} from "./utils/constants";
import {
  formatStackType,
  formatRelativeTime,
  getPortainerWebUrl,
  isStackActive,
} from "./utils/helpers";

export default function StacksCommand() {
  const { data: stacks, isLoading, revalidate } = useStacks();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search stacks...">
      {stacks?.map((stack) => (
        <StackListItem key={stack.Id} stack={stack} revalidate={revalidate} />
      ))}
    </List>
  );
}

function StackListItem({
  stack,
  revalidate,
}: {
  stack: Stack;
  revalidate: () => void;
}) {
  const isActive = isStackActive(stack);
  const statusLabel = STACK_STATUS_LABELS[stack.Status] || "Unknown";

  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: statusLabel,
        color: STACK_STATUS_COLORS[stack.Status] || Color.SecondaryText,
      },
    },
    {
      text: formatStackType(stack.Type),
    },
    {
      text: formatRelativeTime(stack.CreationDate),
    },
  ];

  const handleStart = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting stack...",
    });

    try {
      await portainerApi.startStack(stack.Id, stack.EndpointId);
      toast.style = Toast.Style.Success;
      toast.title = "Stack started";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start stack";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const handleStop = async () => {
    const confirmed = await confirmAlert({
      title: "Stop Stack",
      message: `Are you sure you want to stop "${stack.Name}"?`,
      primaryAction: {
        title: "Stop",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping stack...",
    });

    try {
      await portainerApi.stopStack(stack.Id, stack.EndpointId);
      toast.style = Toast.Style.Success;
      toast.title = "Stack stopped";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to stop stack";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  return (
    <List.Item
      title={stack.Name}
      subtitle={`Environment ID: ${stack.EndpointId}`}
      icon={{
        source: STACK_STATUS_ICONS[stack.Status] || DEFAULT_ICONS.stack,
        tintColor: STACK_STATUS_COLORS[stack.Status] || Color.SecondaryText,
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isActive ? (
              <Action
                title="Stop Stack"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={handleStop}
              />
            ) : (
              <Action
                title="Start Stack"
                icon={Icon.Play}
                onAction={handleStart}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Stack Name"
              content={stack.Name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.OpenInBrowser
              title="Open in Portainer"
              url={getPortainerWebUrl(
                portainerApi.getPortainerUrl(),
                portainerApi.getEndpointIdSync(),
                "stack",
                stack.Id,
              )}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
