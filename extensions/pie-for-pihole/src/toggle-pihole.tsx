import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPiholeAPI } from "./api/client";

export default function TogglePihole() {
  const {
    isLoading,
    data: currentStatus,
    mutate,
    revalidate,
  } = useCachedPromise(async () => {
    const summary = await getPiholeAPI().getSummary();
    return summary.status;
  });

  async function handleToggle(action: "enable" | "disable", duration?: number) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: action === "enable" ? "Enabling Pi-hole..." : "Disabling Pi-hole...",
    });
    try {
      const api = getPiholeAPI();
      const apiCall = action === "enable" ? api.enable() : api.disable(duration);
      await mutate(apiCall, {
        optimisticUpdate() {
          return action === "enable" ? "enabled" : "disabled";
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = action === "enable" ? "Pi-hole enabled!" : "Pi-hole disabled!";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to toggle Pi-hole";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Current Pi-hole status">
        <List.Item
          key="Current status"
          title={currentStatus ?? "unknown"}
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
        />
      </List.Section>

      <List.Section title="Pi-hole toggle options">
        {currentStatus === "enabled" ? (
          <>
            <List.Item
              key="disable"
              title="Disable indefinitely"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable Indefinitely" onAction={() => handleToggle("disable")} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              key="disable1min"
              title="Disable for 1 minute"
              icon={{ source: Icon.Clock, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable for 1 Minute" onAction={() => handleToggle("disable", 60)} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              key="disable5min"
              title="Disable for 5 minutes"
              icon={{ source: Icon.Clock, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable for 5 Minutes" onAction={() => handleToggle("disable", 300)} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              key="disable15min"
              title="Disable for 15 minutes"
              icon={{ source: Icon.Clock, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable for 15 Minutes" onAction={() => handleToggle("disable", 900)} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              key="disable1hour"
              title="Disable for 1 hour"
              icon={{ source: Icon.Clock, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable for 1 Hour" onAction={() => handleToggle("disable", 3600)} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          </>
        ) : (
          <List.Item
            key="enable"
            title="Enable Pi-hole"
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action title="Enable Pi-hole" onAction={() => handleToggle("enable")} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
