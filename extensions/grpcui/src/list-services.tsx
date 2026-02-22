import { ActionPanel, Action, List, Icon, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getServices, deleteService } from "./utils/storage";
import { openInTerminal } from "./utils/terminal";

export default function Command() {
  const { data: items, isLoading, revalidate } = usePromise(getServices);

  const handleDelete = async (title: string) => {
    await deleteService(title);
    revalidate();
  };

  return (
    <List isLoading={isLoading}>
      {items &&
        Object.entries(items).map(([title, url]) => (
          <List.Item
            key={title}
            title={title}
            subtitle={url}
            actions={
              <ActionPanel>
                <Action title="Select" icon={Icon.Terminal} onAction={() => openInTerminal(url)} />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(title)}
                />
                <Action title="Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
