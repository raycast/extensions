import { Action, ActionPanel, List, Icon, LocalStorage, useNavigation, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { TabGroup } from "../manage-tab-groups";
import SelectBookmarksForm from "./SelectBookmarksForm";

const STORAGE_KEY = "tab-groups";

interface SelectGroupForBookmarksFormProps {
  folderName: string;
  bookmarks: Array<{ title: string; url: string }>;
}

export default function SelectGroupForBookmarksForm({ folderName, bookmarks }: SelectGroupForBookmarksFormProps) {
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function loadGroups() {
      try {
        const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
        if (stored) {
          setGroups(JSON.parse(stored));
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadGroups();
  }, []);

  const handleSelect = (groupId: string) => {
    push(<SelectBookmarksForm folderName={folderName} bookmarks={bookmarks} mode="add" targetGroupId={groupId} />);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a group...">
      <List.EmptyView title="No Groups Found" description="Create a group first in 'Manage Tab Groups'." />

      {groups.map((group) => (
        <List.Item
          key={group.id}
          title={group.name}
          icon={{ source: Icon.Folder, tintColor: Color.Purple }}
          accessories={[{ text: `${group.sites.length} sites` }]}
          actions={
            <ActionPanel>
              <Action title="Import into This Group" icon={Icon.Check} onAction={() => handleSelect(group.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
