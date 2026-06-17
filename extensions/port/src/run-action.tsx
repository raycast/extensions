import { Action, ActionPanel, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getActions, getActionUrl, PortAction } from "./api/port-client";

function getTriggerTypeLabel(action: PortAction): string {
  const type = action.trigger.type;
  const operation = action.trigger.operation;

  if (type === "self-service") return "Self-Service";
  if (type === "automation") return "Automation";
  if (operation === "CREATE") return "Create";
  if (operation === "DELETE") return "Delete";
  if (operation === "DAY-2") return "Day-2";

  return type;
}

export default function RunActionCommand() {
  const {
    data: actions,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      const allActions = await getActions();
      // Filter to self-service actions and sort by title
      return allActions
        .filter((action) => action.trigger.type === "self-service" || !action.trigger.type)
        .sort((a, b) => a.title.localeCompare(b.title));
    },
    [],
    {
      keepPreviousData: true,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load actions",
          message: err.message,
        });
      },
    },
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load actions"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search actions...">
      {actions?.map((action) => (
        <List.Item
          key={action.identifier}
          icon={Icon.Play}
          title={action.title}
          subtitle={action.description}
          accessories={[{ text: action.blueprint || "" }, { text: getTriggerTypeLabel(action) }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Port" url={getActionUrl(action)} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={getActionUrl(action)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Identifier"
                  content={action.identifier}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
