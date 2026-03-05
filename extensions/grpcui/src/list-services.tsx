import { ActionPanel, Action, List, Icon, openExtensionPreferences, confirmAlert, Alert } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getServices, deleteService } from "./utils/storage";
import { openInTerminal } from "./utils/terminal";

export default function Command() {
  const { data: items, isLoading, revalidate } = usePromise(getServices);

  const handleDelete = async (id: string, title: string) => {
    if (
      await confirmAlert({
        title: "Delete Service?",
        message: `Remove "${title}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await deleteService(id);
      revalidate();
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search services...">
      <List.EmptyView title="No Services" description="Add a gRPC service to get started" icon={Icon.Terminal} />
      {items &&
        items.map(({ id, title, url }) => (
          <List.Item
            key={id}
            title={title}
            subtitle={url}
            actions={
              <ActionPanel>
                <Action title="Launch in Terminal" icon={Icon.Terminal} onAction={() => openInTerminal(url)} />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(id, title)}
                />
                <Action title="Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
