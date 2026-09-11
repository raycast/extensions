import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useTryDirectories } from "./hooks/useTryDirectories";
import { TryListItem } from "./components/TryListItem";
import { CreateForm } from "./components/CreateForm";
import { CloneForm } from "./components/CloneForm";
import { getTryPath } from "./lib/constants";

export default function BrowseCommand() {
  const { data: directories, isLoading, revalidate } = useTryDirectories();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search try directories..." navigationTitle="Try Directories">
      <List.Section title="Try Directories" subtitle={getTryPath()}>
        {directories?.map((directory) => (
          <TryListItem key={directory.path} directory={directory} onRefresh={revalidate} />
        ))}
      </List.Section>
      {!isLoading && (!directories || directories.length === 0) && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No try directories"
          description="Press ⌘+N to create your first directory"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Directory"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateForm onSuccess={revalidate} />}
              />
              <Action.Push
                title="Clone Repository"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                target={<CloneForm onSuccess={revalidate} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
