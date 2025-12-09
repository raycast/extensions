import { Action, ActionPanel, List, Icon, LocalStorage, useNavigation, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { TabGroup } from "../manage-tab-groups";

const STORAGE_KEY = "tab-groups";

interface SelectGroupFormProps {
  onSelect: (groupId: string) => void;
}

export default function SelectGroupForm({ onSelect }: SelectGroupFormProps) {
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        setGroups(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (groupId: string) => {
    onSelect(groupId);
    pop();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a group...">
      <List.EmptyView title="No Groups Found" description="Create a group first in 'Manage Tab Groups'" />

      {groups.map((group) => (
        <List.Item
          key={group.id}
          title={group.name}
          icon={{ source: Icon.Folder, tintColor: Color.Purple }}
          accessories={[{ text: `${group.sites.length} sites` }]}
          actions={
            <ActionPanel>
              <Action title="Select This Group" icon={Icon.Check} onAction={() => handleSelect(group.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
